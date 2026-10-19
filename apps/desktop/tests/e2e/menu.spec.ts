import { test, expect, chooseFolderInNextNativeDialog } from './fixtures';

test('one native menu opens workspace and section actions', async ({
  desktopApp,
  desktopPage,
  contentRoot,
}) => {
  const labels = await desktopApp.evaluate(({ Menu }) =>
    Menu.getApplicationMenu()?.items.map((item) => item.label),
  );
  expect(labels).toEqual(['File', 'Edit', 'View', 'Workspace', 'Window', 'Help']);
  await expect(desktopPage.locator('.titlebar')).toHaveCount(0);

  async function clickMenu(id: string) {
    await desktopApp.evaluate(({ Menu }, commandId) => {
      const item = Menu.getApplicationMenu()?.getMenuItemById(commandId);
      if (!item?.click) throw new Error(`Menu item ${commandId} is unavailable`);
      (item.click as () => void)();
    }, id);
  }

  await chooseFolderInNextNativeDialog(desktopApp, contentRoot);
  await clickMenu('file.choose-content-folder');
  await expect(desktopPage.getByText('Content folder selected')).toBeVisible();

  await clickMenu('workspace.new');
  await desktopPage.getByRole('textbox', { name: 'New workspace name' }).fill('Physics');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.getByRole('heading', { name: 'Physics' })).toBeVisible();

  await clickMenu('file.new-section');
  await desktopPage.getByRole('textbox', { name: 'New section' }).fill('Motion');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.getByRole('tab', { name: 'Motion' })).toBeVisible();

  await clickMenu('workspace.new');
  await desktopPage.getByRole('textbox', { name: 'New workspace name' }).fill('Biology');
  await desktopPage.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(desktopPage.getByRole('heading', { name: 'Biology' })).toBeVisible();
  await clickMenu('workspace.switch');
  await desktopPage.getByRole('button', { name: 'Physics', exact: true }).click();
  await expect(desktopPage.getByRole('tab', { name: 'Motion' })).toBeVisible();
});
