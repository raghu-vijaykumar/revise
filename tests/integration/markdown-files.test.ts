import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MarkdownFileCoordinator,
  resolveSectionPath,
} from '../../apps/desktop/src/main/storage/markdownFiles';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function workspaceRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'revise-files-'));
  roots.push(root);
  return root;
}

describe('workspace Markdown writer', () => {
  it('creates and replaces only the requested Markdown file', async () => {
    const root = await workspaceRoot();
    const writer = new MarkdownFileCoordinator(root);
    const first = await writer.save('Mechanics/Motion.md', null, '# Motion\r\n');
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/);
    const second = await writer.save(
      'Mechanics/Motion.md',
      first.hash,
      '# Motion\r\n\r\nForce.\r\n',
    );
    expect(second.hash).not.toBe(first.hash);
    expect(await readFile(join(root, 'Mechanics', 'Motion.md'), 'utf8')).toBe(
      '# Motion\r\n\r\nForce.\r\n',
    );
  });

  it('rejects external edits and concurrent stale writes', async () => {
    const root = await workspaceRoot();
    const writer = new MarkdownFileCoordinator(root);
    const first = await writer.save('Motion.md', null, '# First');
    const results = await Promise.allSettled([
      writer.save('Motion.md', first.hash, '# Second'),
      writer.save('Motion.md', first.hash, '# Third'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    await writeFile(join(root, 'Motion.md'), '# Outside');
    await expect(writer.save('Motion.md', first.hash, '# Unsafe')).rejects.toThrow('File changed');
    expect(await readFile(join(root, 'Motion.md'), 'utf8')).toBe('# Outside');
  });

  it('does not resolve path escapes or non-Markdown targets', async () => {
    const root = await workspaceRoot();
    await expect(resolveSectionPath(root, '../outside.md')).rejects.toThrow();
    await expect(resolveSectionPath(root, 'C:/outside.md')).rejects.toThrow();
    await expect(resolveSectionPath(root, 'video.mp4')).rejects.toThrow();
  });

  it('reports an external file edit without treating an own save as external', async () => {
    const root = await workspaceRoot();
    const writer = new MarkdownFileCoordinator(root);
    await writer.save('Motion.md', null, '# First');
    let notify: (content: string | null) => void = () => undefined;
    const observed = new Promise<string | null>((resolve) => {
      notify = resolve;
    });
    const stop = await writer.watchSection('Motion.md', (current) =>
      notify(current?.content ?? null),
    );
    try {
      await writeFile(join(root, 'Motion.md'), '# Outside');
      await expect(observed).resolves.toBe('# Outside');
    } finally {
      stop();
    }
  });
});
