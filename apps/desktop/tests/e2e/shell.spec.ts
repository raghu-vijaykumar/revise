import { test, expect, chooseFolderInNextNativeDialog } from './fixtures';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

test('desktop shell keeps explorer, chat, and global editor group visible', async ({
  desktopApp,
  desktopPage,
  contentRoot,
}, testInfo) => {
  const errors: string[] = [];
  const logs: string[] = [];
  desktopPage.on('console', (message) => {
    logs.push(message.text());
    if (message.type() === 'error') errors.push(message.text());
  });
  const viewport = testInfo.project.use.viewport as { width: number; height: number };
  await desktopApp.evaluate(({ BrowserWindow }, size) => {
    // Resize the native window; emulating a larger viewport can tile Electron's surface.
    BrowserWindow.getAllWindows()[0]?.setContentSize(size.width, size.height);
  }, viewport);
  await expect(desktopPage).toHaveTitle('Revise');
  await expect(desktopPage.getByRole('navigation', { name: 'Activity' })).toBeVisible();
  await expect(desktopPage.getByRole('complementary', { name: 'Section explorer' })).toBeVisible();
  await expect(desktopPage.getByRole('complementary', { name: 'AI chat' })).toBeVisible();
  await expect(desktopPage.getByRole('tab', { name: 'Welcome' })).toBeVisible();
  await desktopPage.screenshot({ path: testInfo.outputPath('shell.png') });
  await expect(desktopPage).toHaveScreenshot('shell.png', { animations: 'disabled' });
  await chooseFolderInNextNativeDialog(desktopApp, contentRoot);
  await desktopPage.getByRole('button', { name: 'Choose content folder' }).click();
  await expect(desktopPage.getByText('Content folder selected')).toBeVisible();
  await desktopPage.getByRole('button', { name: 'Create workspace' }).click();
  await desktopPage.getByRole('textbox', { name: 'New workspace name' }).fill('Physics');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.getByRole('heading', { name: 'Physics' })).toBeVisible();
  await desktopPage.getByRole('button', { name: 'Create workspace' }).click();
  await desktopPage.getByRole('textbox', { name: 'New workspace name' }).fill('Biology');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.getByRole('heading', { name: 'Biology' })).toBeVisible();
  expect(existsSync(join(contentRoot, 'Physics', '.ai-notes', 'workspace.json'))).toBe(true);
  expect(existsSync(join(contentRoot, 'Biology', '.ai-notes', 'workspace.json'))).toBe(true);
  await desktopPage.getByRole('button', { name: 'Switch workspace' }).click();
  await desktopPage.getByRole('button', { name: 'Physics', exact: true }).click();
  await expect(desktopPage.getByRole('heading', { name: 'Physics' })).toBeVisible();
  await desktopPage.getByRole('button', { name: 'Add section' }).click();
  await desktopPage.getByRole('textbox', { name: 'New section' }).fill('Motion');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.getByRole('tab', { name: 'Motion' })).toBeVisible();
  await expect(desktopPage.locator('.section-prosemirror h1')).toHaveText('Motion');
  await desktopPage.getByRole('button', { name: 'Heading 2' }).click();
  await expect(desktopPage.locator('.section-prosemirror h2')).toHaveText('Motion');
  await expect(desktopPage.getByRole('status', { name: '' })).toHaveText('Saved');
  await desktopPage
    .getByRole('textbox', { name: 'Question draft' })
    .fill('Why does velocity change?');
  const explorerHandle = desktopPage.getByRole('separator', { name: 'Resize section explorer' });
  await explorerHandle.focus();
  await explorerHandle.press('ArrowRight');
  await expect(explorerHandle).toHaveAttribute('aria-valuenow', '303');
  await desktopPage.getByRole('button', { name: 'Switch workspace' }).click();
  await desktopPage.getByRole('button', { name: 'Biology', exact: true }).click();
  await expect(desktopPage.getByRole('textbox', { name: 'Question draft' })).toHaveValue('');
  await desktopPage.getByRole('button', { name: 'Switch workspace' }).click();
  await desktopPage.getByRole('button', { name: 'Physics', exact: true }).click();
  await expect(desktopPage.getByRole('textbox', { name: 'Question draft' })).toHaveValue(
    'Why does velocity change?',
  );
  const sectionIds = readdirSync(join(contentRoot, 'Physics', 'sections'));
  expect(sectionIds).toHaveLength(1);
  expect(
    readFileSync(join(contentRoot, 'Physics', 'sections', sectionIds[0]!, 'index.md'), 'utf8'),
  ).toContain('## Motion');
  await desktopPage.screenshot({ path: testInfo.outputPath('workspace-switcher.png') });
  expect(errors).toEqual([]);
  expect(logs.join('\n')).not.toContain(contentRoot);
});
