import { lstat, realpath, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import {
  sectionIdSchema,
  workspaceIdSchema,
  parseVideoLink,
  videoMarkdownLink,
} from '@revise/core';
import { copyVideoBesideSection } from '../storage/sectionMedia';
import { resolveSectionPath } from '../storage/markdownFiles';

const mediaName = /^([a-f0-9]{64})\.(mp4|webm)$/i;

export function validatedYoutubeMarkdown(url: string): string {
  const link = parseVideoLink(url, 'YouTube video');
  if (!link || link.kind !== 'youtube')
    throw new Error('Enter a supported HTTPS YouTube video URL');
  return videoMarkdownLink(link);
}

export async function stageSectionVideo(
  workspaceRoot: string,
  relativeMarkdownPath: string,
  sectionId: string,
  selectedFile: string,
): Promise<{ markdownLink: string; relativeLink: string }> {
  const staged = await copyVideoBesideSection(
    workspaceRoot,
    relativeMarkdownPath,
    sectionId,
    selectedFile,
  );
  const link = parseVideoLink(staged.relativeLink, 'Local video');
  if (!link || link.kind !== 'local') throw new Error('Invalid staged video link');
  return { markdownLink: videoMarkdownLink(link), relativeLink: staged.relativeLink };
}

export async function resolveSectionVideoRequest(
  workspaceRoot: string,
  relativeMarkdownPath: string,
  workspaceId: string,
  sectionId: string,
  requestUrl: string,
): Promise<string> {
  workspaceIdSchema.parse(workspaceId);
  sectionIdSchema.parse(sectionId);
  const url = new URL(requestUrl);
  const parts = url.pathname.split('/').filter(Boolean);
  if (
    url.protocol !== 'revise-media:' ||
    url.hostname !== workspaceId ||
    parts.length !== 2 ||
    parts[0] !== sectionId ||
    url.search ||
    url.hash ||
    !mediaName.test(parts[1]!)
  ) {
    throw new Error('Invalid local video request');
  }
  const sectionPath = await resolveSectionPath(workspaceRoot, relativeMarkdownPath);
  const mediaDirectory = join(dirname(sectionPath), '.assets', sectionId);
  const root = await realpath(workspaceRoot);
  const fromRoot = relative(root, mediaDirectory);
  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error('Video path escapes workspace');
  }
  let cursor = root;
  for (const part of fromRoot.split(sep)) {
    cursor = join(cursor, part);
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Linked media path is unsafe');
  }
  const file = join(mediaDirectory, parts[1]!);
  if ((await lstat(file)).isSymbolicLink() || !(await stat(file)).isFile()) {
    throw new Error('Video file is unavailable');
  }
  return file;
}
