import { createHash, randomUUID } from 'node:crypto';
import { watch, type FSWatcher } from 'node:fs';
import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { relativeMarkdownPathSchema } from '@revise/core';

export class MarkdownConflictError extends Error {}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function resolveSectionPath(
  workspaceRoot: string,
  relativeMarkdownPath: string,
): Promise<string> {
  const safePath = relativeMarkdownPathSchema.parse(relativeMarkdownPath);
  const root = await realpath(workspaceRoot);
  const target = resolve(root, ...safePath.split('/'));
  const fromRoot = relative(root, target);
  if (!fromRoot || fromRoot.startsWith(`..${sep}`) || fromRoot === '..' || isAbsolute(fromRoot)) {
    throw new Error('Section path escapes its workspace');
  }

  let current = root;
  for (const part of safePath.split('/')) {
    current = join(current, part);
    try {
      // Existing junctions and links cannot redirect writes outside the chosen root.
      if ((await lstat(current)).isSymbolicLink()) throw new Error('Linked section path is unsafe');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return target;
}

type ReadResult = { content: string; hash: string } | null;

export class MarkdownFileCoordinator {
  private readonly queues = new Map<string, Promise<void>>();
  private readonly knownHashes = new Map<string, string>();

  constructor(private readonly workspaceRoot: string) {}

  async read(relativeMarkdownPath: string): Promise<ReadResult> {
    const target = await resolveSectionPath(this.workspaceRoot, relativeMarkdownPath);
    try {
      const content = await readFile(target, 'utf8');
      return { content, hash: sha256(content) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async save(
    relativeMarkdownPath: string,
    expectedHash: string | null,
    content: string,
  ): Promise<{ hash: string }> {
    const previous = this.queues.get(relativeMarkdownPath) ?? Promise.resolve();
    const run = previous.then(() => this.saveOne(relativeMarkdownPath, expectedHash, content));
    const settled = run.then(
      () => undefined,
      () => undefined,
    );
    this.queues.set(relativeMarkdownPath, settled);
    try {
      return await run;
    } finally {
      if (this.queues.get(relativeMarkdownPath) === settled)
        this.queues.delete(relativeMarkdownPath);
    }
  }

  private async saveOne(
    relativeMarkdownPath: string,
    expectedHash: string | null,
    content: string,
  ): Promise<{ hash: string }> {
    let target = await resolveSectionPath(this.workspaceRoot, relativeMarkdownPath);
    await mkdir(dirname(target), { recursive: true });
    target = await resolveSectionPath(this.workspaceRoot, relativeMarkdownPath);
    const current = await this.read(relativeMarkdownPath);
    if ((current?.hash ?? null) !== expectedHash)
      throw new MarkdownConflictError('File changed since edit');

    const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
    try {
      const file = await open(temporary, 'wx');
      try {
        await file.writeFile(content, 'utf8');
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
    const hash = sha256(content);
    this.knownHashes.set(relativeMarkdownPath, hash);
    return { hash };
  }

  async watchSection(
    relativeMarkdownPath: string,
    onExternalChange: (current: ReadResult) => void,
  ): Promise<() => void> {
    const target = await resolveSectionPath(this.workspaceRoot, relativeMarkdownPath);
    const current = await this.read(relativeMarkdownPath);
    if (current) this.knownHashes.set(relativeMarkdownPath, current.hash);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watcher: FSWatcher = watch(dirname(target), (_event, filename) => {
      if (filename && String(filename).toLowerCase() !== basename(target).toLowerCase()) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void this.read(relativeMarkdownPath).then((latest) => {
          if ((latest?.hash ?? '') !== (this.knownHashes.get(relativeMarkdownPath) ?? '')) {
            if (latest) this.knownHashes.set(relativeMarkdownPath, latest.hash);
            else this.knownHashes.delete(relativeMarkdownPath);
            onExternalChange(latest);
          }
        });
      }, 100);
    });
    return () => {
      if (timer) clearTimeout(timer);
      watcher.close();
    };
  }
}
