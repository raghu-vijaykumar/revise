import { test, expect, chooseFolderInNextNativeDialog } from './fixtures';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test('section embeds YouTube and adjacent local video as portable links', async ({
  desktopApp,
  desktopPage,
  contentRoot,
  testRoot,
}) => {
  await chooseFolderInNextNativeDialog(desktopApp, contentRoot);
  await desktopPage.getByRole('button', { name: 'Choose content folder' }).click();
  await desktopPage.getByRole('button', { name: 'Create workspace' }).click();
  await desktopPage.getByRole('textbox', { name: 'New workspace name' }).fill('Physics');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await desktopPage.getByRole('button', { name: 'Add section' }).click();
  await desktopPage.getByRole('textbox', { name: 'New section' }).fill('Motion');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.locator('.section-prosemirror h1')).toHaveText('Motion');

  await desktopPage.getByRole('button', { name: 'Insert video' }).click();
  await desktopPage
    .getByRole('textbox', { name: 'YouTube URL' })
    .fill('https://youtu.be/dQw4w9WgXcQ');
  await desktopPage.getByRole('button', { name: 'Embed YouTube video' }).click();
  await expect(desktopPage.locator('.section-prosemirror iframe')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );
  await expect(desktopPage.locator('.section-prosemirror iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-presentation',
  );
  await expect(desktopPage.getByRole('status')).toHaveText('Saved');

  const sourceVideo = join(testRoot, 'clip.mp4');
  writeFileSync(sourceVideo, 'local video fixture');
  await chooseFolderInNextNativeDialog(desktopApp, sourceVideo);
  await desktopPage.getByRole('button', { name: 'Insert video' }).click();
  await desktopPage.getByRole('button', { name: 'Choose local MP4 or WebM…' }).click();
  await expect(desktopPage.locator('.section-prosemirror video')).toBeVisible();
  await expect(desktopPage.getByRole('status')).toHaveText('Saved');
  const sectionId = readdirSync(join(contentRoot, 'Physics', 'sections'))[0]!;
  const sectionRoot = join(contentRoot, 'Physics', 'sections', sectionId);
  const markdown = readFileSync(join(sectionRoot, 'index.md'), 'utf8');
  expect(markdown).toContain('[YouTube video](https://youtu.be/dQw4w9WgXcQ)');
  expect(markdown).toMatch(
    new RegExp(`\\[Local video\\]\\(\\./\\.assets/${sectionId}/[a-f0-9]{64}\\.mp4\\)`),
  );
  const asset = readdirSync(join(sectionRoot, '.assets', sectionId))[0]!;
  expect(existsSync(join(sectionRoot, '.assets', sectionId, asset))).toBe(true);
});
