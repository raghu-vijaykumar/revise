import { test, expect, chooseFolderInNextNativeDialog } from './fixtures';

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
  expect(errors).toEqual([]);
  expect(logs.join('\n')).not.toContain(contentRoot);
});
