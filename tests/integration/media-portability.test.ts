import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openWorkspaceDatabase } from '../../apps/desktop/src/main/storage/migrations';
import { NoteService } from '../../apps/desktop/src/main/notes/noteService';
import {
  resolveSectionVideoRequest,
  stageSectionVideo,
  validatedYoutubeMarkdown,
} from '../../apps/desktop/src/main/media/videoEmbedService';

const workspaceId = '58ac7960-9012-41cf-9d13-ed970417c790';
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('section video links', () => {
  it('copies a local video beside its Markdown and resolves only that section media', async () => {
    const root = await mkdtemp(join(tmpdir(), 'revise-video-'));
    roots.push(root);
    const db = openWorkspaceDatabase(root);
    try {
      const notes = new NoteService(workspaceId, root, db);
      const section = await notes.createSection('Motion');
      const selected = join(root, 'selected.mp4');
      await writeFile(selected, 'test video bytes');
      const staged = await stageSectionVideo(
        root,
        section.relativeMarkdownPath,
        section.id,
        selected,
      );
      expect(staged.markdownLink).toContain(staged.relativeLink);
      const fileName = staged.relativeLink.split('/').at(-1)!;
      const localUrl = `revise-media://${workspaceId}/${section.id}/${fileName}`;
      const resolved = await resolveSectionVideoRequest(
        root,
        section.relativeMarkdownPath,
        workspaceId,
        section.id,
        localUrl,
      );
      expect(await readFile(resolved, 'utf8')).toBe('test video bytes');
      await expect(
        resolveSectionVideoRequest(
          root,
          section.relativeMarkdownPath,
          workspaceId,
          section.id,
          `revise-media://${workspaceId}/00000000-0000-4000-8000-000000000000/${fileName}`,
        ),
      ).rejects.toThrow();
      await expect(
        resolveSectionVideoRequest(
          root,
          section.relativeMarkdownPath,
          workspaceId,
          section.id,
          `${localUrl}?other=1`,
        ),
      ).rejects.toThrow();
    } finally {
      db.close();
    }
  });

  it('accepts only supported HTTPS YouTube addresses', () => {
    expect(validatedYoutubeMarkdown('https://youtu.be/dQw4w9WgXcQ')).toBe(
      '[YouTube video](https://youtu.be/dQw4w9WgXcQ)',
    );
    expect(() => validatedYoutubeMarkdown('http://youtu.be/dQw4w9WgXcQ')).toThrow();
    expect(() => validatedYoutubeMarkdown('https://youtube.example/watch?v=dQw4w9WgXcQ')).toThrow();
  });
});
