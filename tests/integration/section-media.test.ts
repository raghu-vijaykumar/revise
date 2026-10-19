import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyVideoBesideSection } from '../../apps/desktop/src/main/storage/sectionMedia';
import { stageSourceBlob } from '../../apps/desktop/src/main/storage/blobStore';

const roots: string[] = [];
const sectionId = '58ac7960-9012-41cf-9d13-ed970417c790';
const fixture = resolve('tests/fixtures/sample-video.mp4');

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function workspaceRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'revise-media-'));
  roots.push(root);
  await mkdir(join(root, 'Mechanics'));
  await writeFile(join(root, 'Mechanics', 'Motion.md'), '# Motion');
  return root;
}

describe('section-adjacent local media', () => {
  it('copies a video beside its Markdown section and returns a relative link', async () => {
    const root = await workspaceRoot();
    const first = await copyVideoBesideSection(root, 'Mechanics/Motion.md', sectionId, fixture);
    const second = await copyVideoBesideSection(root, 'Mechanics/Motion.md', sectionId, fixture);
    expect(first.relativeLink).toMatch(/^\.\/\.assets\//);
    expect(first.relativeLink).toBe(second.relativeLink);
    expect(first.relativeLink).toContain(sectionId);
    expect(
      await readFile(join(dirname(join(root, 'Mechanics', 'Motion.md')), first.relativeLink)),
    ).toEqual(await readFile(fixture));
    expect(await readdir(join(root, 'Mechanics', '.assets', sectionId))).toHaveLength(1);
  });

  it('rejects a missing or unsupported file without a dangling media link', async () => {
    const root = await workspaceRoot();
    await expect(
      copyVideoBesideSection(root, 'Mechanics/Motion.md', sectionId, join(root, 'missing.mp4')),
    ).rejects.toThrow();
    const textPath = join(root, 'note.txt');
    await writeFile(textPath, 'not video');
    await expect(
      copyVideoBesideSection(root, 'Mechanics/Motion.md', sectionId, textPath),
    ).rejects.toThrow('Unsupported video file');
    expect(await readdir(join(root, 'Mechanics'))).toEqual(['Motion.md']);
  });

  it('stages a separate source original in the workspace blob area', async () => {
    const root = await workspaceRoot();
    const staged = await stageSourceBlob(root, fixture);
    expect(staged.relativePath).toMatch(/^assets\/blobs\//);
    expect(await readFile(join(root, staged.relativePath))).toEqual(await readFile(fixture));
  });
});
