import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openWorkspaceDatabase } from '../../apps/desktop/src/main/storage/migrations';
import { NoteService } from '../../apps/desktop/src/main/notes/noteService';

const roots: string[] = [];
const physicsId = '58ac7960-9012-41cf-9d13-ed970417c790';
const biologyId = '6a77bdb5-9f22-4b94-bb40-5bdf0e1329f4';
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(workspaceId = physicsId) {
  const root = await mkdtemp(join(tmpdir(), 'revise-notes-'));
  roots.push(root);
  const db = openWorkspaceDatabase(root);
  return { root, db, notes: new NoteService(workspaceId, root, db) };
}

describe('Markdown backed section tree', () => {
  it('creates, renames, reorders, and soft deletes sections without exposing filenames', async () => {
    const { root, db, notes } = await fixture();
    try {
      const physics = await notes.createSection('Physics');
      const biology = await notes.createSection('Biology');
      expect(physics.relativeMarkdownPath).toMatch(/^sections\/[a-f0-9-]+\/index\.md$/);
      expect(await readFile(join(root, physics.relativeMarkdownPath), 'utf8')).toBe('# Physics\n');
      expect(notes.renameSection(physics.id, 'Mechanics').displayTitle).toBe('Mechanics');
      expect(
        notes.reorderSections(null, [biology.id, physics.id]).map((section) => section.id),
      ).toEqual([biology.id, physics.id]);
      expect(() => notes.reorderSections(null, [physics.id, physics.id])).toThrow('exactly once');
      notes.deleteSection(physics.id);
      expect(notes.listSections().map((section) => section.id)).toEqual([biology.id]);
      expect(await readFile(join(root, physics.relativeMarkdownPath), 'utf8')).toBe('# Physics\n');
      expect(notes.restoreSection(physics.id).displayTitle).toBe('Mechanics');
    } finally {
      db.close();
    }
  });

  it('moves a nested section and its adjacent media in one directory rename', async () => {
    const { root, db, notes } = await fixture();
    try {
      const mechanics = await notes.createSection('Mechanics');
      const optics = await notes.createSection('Optics');
      const motion = await notes.createSection('Motion', mechanics.id);
      const child = await notes.createSection('Velocity', motion.id);
      const mediaDir = join(root, dirname(motion.relativeMarkdownPath), '.assets', motion.id);
      await mkdir(mediaDir, { recursive: true });
      await writeFile(join(mediaDir, 'clip.mp4'), 'video bytes');
      const moved = await notes.moveSection(motion.id, optics.id);
      expect(moved.parentId).toBe(optics.id);
      expect(moved.relativeMarkdownPath).toContain(`/${optics.id}/${motion.id}/index.md`);
      expect(notes.getSection(child.id).relativeMarkdownPath).toContain(
        `/${motion.id}/${child.id}/index.md`,
      );
      expect(
        await readFile(
          join(root, dirname(moved.relativeMarkdownPath), '.assets', motion.id, 'clip.mp4'),
          'utf8',
        ),
      ).toBe('video bytes');
      await expect(readFile(join(root, motion.relativeMarkdownPath), 'utf8')).rejects.toThrow();
      await expect(notes.moveSection(optics.id, child.id)).rejects.toThrow('descendant');
    } finally {
      db.close();
    }
  });

  it('keeps section IDs and SQLite indexes inside the selected workspace', async () => {
    const physics = await fixture(physicsId);
    const biology = await fixture(biologyId);
    try {
      const section = await physics.notes.createSection('Motion');
      expect(physics.notes.getSection(section.id).workspaceId).toBe(physicsId);
      expect(() => biology.notes.getSection(section.id)).toThrow('Section not found');
      expect(biology.notes.listSections()).toEqual([]);
    } finally {
      physics.db.close();
      biology.db.close();
    }
  });
});
