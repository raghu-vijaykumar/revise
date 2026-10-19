import { randomUUID } from 'node:crypto';
import { mkdir, rename, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { sectionIdSchema, type Section } from '@revise/core';
import { enqueueHistoryCommit } from '../storage/historyOutbox';
import { MarkdownFileCoordinator, resolveSectionPath } from '../storage/markdownFiles';

type SectionRow = {
  id: string;
  parent_id: string | null;
  display_title: string;
  relative_markdown_path: string;
  sort_order: number;
  file_hash: string;
  deleted_at: string | null;
};

function sectionFromRow(workspaceId: string, row: SectionRow): Section {
  return {
    id: row.id,
    workspaceId,
    displayTitle: row.display_title,
    parentId: row.parent_id,
    order: row.sort_order,
    relativeMarkdownPath: row.relative_markdown_path,
    fileHash: row.file_hash,
  };
}

function checkedTitle(title: string): string {
  const value = title.trim();
  if (!value || value.length > 200 || /[\x00-\x1f]/.test(value)) {
    throw new Error('Section title must have 1–200 single-line characters');
  }
  return value;
}

export class NoteService {
  private readonly files: MarkdownFileCoordinator;

  constructor(
    private readonly workspaceId: string,
    private readonly workspaceRoot: string,
    private readonly db: DatabaseSync,
  ) {
    this.files = new MarkdownFileCoordinator(workspaceRoot);
  }

  listSections(): Section[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM sections WHERE deleted_at IS NULL ORDER BY parent_id, sort_order, display_title',
      )
      .all() as SectionRow[];
    return rows.map((row) => sectionFromRow(this.workspaceId, row));
  }

  getSection(id: string, includeDeleted = false): Section {
    sectionIdSchema.parse(id);
    const row = this.db.prepare('SELECT * FROM sections WHERE id = ?').get(id) as
      SectionRow | undefined;
    if (!row || (!includeDeleted && row.deleted_at)) throw new Error('Section not found');
    return sectionFromRow(this.workspaceId, row);
  }

  async createSection(title: string, parentId: string | null = null): Promise<Section> {
    const displayTitle = checkedTitle(title);
    const parent = parentId ? this.getSection(parentId) : null;
    const id = randomUUID();
    const sectionDirectory = parent
      ? join(dirname(parent.relativeMarkdownPath), id)
      : join('sections', id);
    const markdownPath = `${sectionDirectory.replaceAll('\\', '/')}/index.md`;
    const fullPath = await resolveSectionPath(this.workspaceRoot, markdownPath);
    await mkdir(dirname(fullPath), { recursive: true });
    const escapedTitle = displayTitle.replace(/([\\`*_{}\[\]()#+.!>~-])/g, '\\$1');
    const saved = await this.files.save(markdownPath, null, `# ${escapedTitle}\n`);
    const orderRow = this.db
      .prepare(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM sections WHERE parent_id IS ? AND deleted_at IS NULL',
      )
      .get(parentId) as { next_order: number };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare(
          'INSERT INTO sections(id, parent_id, display_title, relative_markdown_path, sort_order, file_hash) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(id, parentId, displayTitle, markdownPath, orderRow.next_order, saved.hash);
      enqueueHistoryCommit(this.db, {
        id: randomUUID(),
        sectionId: id,
        fileHash: saved.hash,
        baseCommit: null,
      });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.getSection(id);
  }

  renameSection(id: string, title: string): Section {
    this.getSection(id);
    this.db
      .prepare('UPDATE sections SET display_title = ? WHERE id = ?')
      .run(checkedTitle(title), id);
    return this.getSection(id);
  }

  async moveSection(id: string, newParentId: string | null): Promise<Section> {
    const section = this.getSection(id);
    const parent = newParentId ? this.getSection(newParentId) : null;
    if (section.parentId === newParentId) return section;
    if (newParentId === id) throw new Error('A section cannot contain itself');
    const oldPath = section.relativeMarkdownPath;
    const oldDirectory = dirname(oldPath);
    const parentDirectory = parent ? dirname(parent.relativeMarkdownPath) : 'sections';
    const nextDirectory = join(parentDirectory, id).replaceAll('\\', '/');
    if (
      parent &&
      parent.relativeMarkdownPath.startsWith(`${oldDirectory.replaceAll('\\', '/')}/`)
    ) {
      throw new Error('A section cannot move inside its descendant');
    }
    const currentFile = await resolveSectionPath(this.workspaceRoot, oldPath);
    const nextFile = await resolveSectionPath(this.workspaceRoot, `${nextDirectory}/index.md`);
    const sourceDirectory = dirname(currentFile);
    const destinationDirectory = dirname(nextFile);
    if (!(await stat(currentFile)).isFile())
      throw new Error('Section Markdown file is unavailable');
    await stat(dirname(destinationDirectory));
    try {
      await stat(destinationDirectory);
      throw new Error('Destination section folder already exists');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const affected = this.db
      .prepare(
        'SELECT id, relative_markdown_path, file_hash FROM sections WHERE relative_markdown_path = ? OR relative_markdown_path LIKE ?',
      )
      .all(oldPath, `${oldDirectory.replaceAll('\\', '/')}/%`) as Array<{
      id: string;
      relative_markdown_path: string;
      file_hash: string;
    }>;
    // Each section directory contains its Markdown file, media, and children.
    // A single rename moves that entire subtree together.
    await rename(sourceDirectory, destinationDirectory);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const entry of affected) {
        const suffix = relative(oldDirectory, dirname(entry.relative_markdown_path)).replaceAll(
          '\\',
          '/',
        );
        const newPath = `${nextDirectory}${suffix ? `/${suffix}` : ''}/index.md`;
        this.db
          .prepare('UPDATE sections SET relative_markdown_path = ? WHERE id = ?')
          .run(newPath, entry.id);
        enqueueHistoryCommit(this.db, {
          id: randomUUID(),
          sectionId: entry.id,
          fileHash: entry.file_hash,
          baseCommit: null,
        });
      }
      const nextOrder = this.db
        .prepare(
          'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM sections WHERE parent_id IS ? AND deleted_at IS NULL',
        )
        .get(newParentId) as { next_order: number };
      this.db
        .prepare('UPDATE sections SET parent_id = ?, sort_order = ? WHERE id = ?')
        .run(newParentId, nextOrder.next_order, id);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      await rename(destinationDirectory, sourceDirectory);
      throw error;
    }
    return this.getSection(id);
  }

  reorderSections(parentId: string | null, orderedIds: string[]): Section[] {
    if (parentId) this.getSection(parentId);
    const siblings = this.listSections().filter((section) => section.parentId === parentId);
    const existing = new Set(siblings.map((section) => section.id));
    if (
      orderedIds.length !== existing.size ||
      new Set(orderedIds).size !== existing.size ||
      orderedIds.some((id) => !existing.has(id))
    ) {
      throw new Error('Reorder must contain each sibling section exactly once');
    }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      orderedIds.forEach((id, order) => {
        this.db.prepare('UPDATE sections SET sort_order = ? WHERE id = ?').run(order, id);
      });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.listSections().filter((section) => section.parentId === parentId);
  }

  deleteSection(id: string): void {
    this.getSection(id);
    const now = new Date().toISOString();
    this.db
      .prepare(
        `WITH RECURSIVE subtree(id) AS (
      SELECT id FROM sections WHERE id = ?
      UNION ALL SELECT sections.id FROM sections JOIN subtree ON sections.parent_id = subtree.id
    ) UPDATE sections SET deleted_at = ? WHERE id IN (SELECT id FROM subtree)`,
      )
      .run(id, now);
  }

  restoreSection(id: string): Section {
    const section = this.getSection(id, true);
    if (section.parentId) {
      const parent = this.db
        .prepare('SELECT deleted_at FROM sections WHERE id = ?')
        .get(section.parentId) as { deleted_at: string | null } | undefined;
      if (!parent || parent.deleted_at) throw new Error('Restore the parent section first');
    }
    this.db
      .prepare(
        `WITH RECURSIVE subtree(id) AS (
      SELECT id FROM sections WHERE id = ?
      UNION ALL SELECT sections.id FROM sections JOIN subtree ON sections.parent_id = subtree.id
    ) UPDATE sections SET deleted_at = NULL WHERE id IN (SELECT id FROM subtree)`,
      )
      .run(id);
    return this.getSection(id);
  }

  async saveSection(
    id: string,
    baseFileHash: string,
    markdown: string,
  ): Promise<{ fileHash: string }> {
    const section = this.getSection(id);
    if (section.fileHash !== baseFileHash) throw new Error('Section changed since this edit');
    const saved = await this.files.save(section.relativeMarkdownPath, baseFileHash, markdown);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db
        .prepare('UPDATE sections SET file_hash = ? WHERE id = ? AND file_hash = ?')
        .run(saved.hash, id, baseFileHash);
      if (result.changes !== 1) throw new Error('Section changed since this edit');
      enqueueHistoryCommit(this.db, {
        id: randomUUID(),
        sectionId: id,
        fileHash: saved.hash,
        baseCommit: null,
      });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return { fileHash: saved.hash };
  }
}
