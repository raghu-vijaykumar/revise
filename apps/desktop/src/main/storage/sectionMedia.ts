import { dirname, extname, join } from 'node:path';
import { realpath, stat } from 'node:fs/promises';
import { sectionIdSchema } from '@revise/core';
import { confinedDirectory, stageVerifiedCopy } from './blobStore';
import { resolveSectionPath } from './markdownFiles';

const videoTypes = new Map([
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
]);

export async function copyVideoBesideSection(
  workspaceRoot: string,
  relativeMarkdownPath: string,
  sectionId: string,
  selectedFilePath: string,
): Promise<{ contentHash: string; relativeLink: string; mediaType: string; byteLength: number }> {
  const safeId = sectionIdSchema.parse(sectionId);
  const extension = extname(selectedFilePath).toLowerCase();
  const mediaType = videoTypes.get(extension);
  if (!mediaType) throw new Error('Unsupported video file; choose MP4 or WebM');
  const source = await realpath(selectedFilePath);
  if (!(await stat(source)).isFile()) throw new Error('Expected a regular video file');
  const sectionPath = await resolveSectionPath(workspaceRoot, relativeMarkdownPath);
  const directory = await confinedDirectory(
    workspaceRoot,
    join(dirname(sectionPath), '.assets', safeId),
  );
  // Write the link only after the adjacent copy has been verified and renamed.
  const staged = await stageVerifiedCopy(source, directory, extension);
  return {
    contentHash: staged.contentHash,
    relativeLink: `./.assets/${safeId}/${staged.fileName}`,
    mediaType,
    byteLength: staged.byteLength,
  };
}
