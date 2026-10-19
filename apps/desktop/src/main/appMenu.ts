import { app, dialog, Menu, type MenuItemConstructorOptions } from 'electron';
import type { NativeMenuAction } from '../types/menu';

export function installApplicationMenu(dispatch: (action: NativeMenuAction) => void): void {
  const command = (
    id: string,
    label: string,
    accelerator: string,
    action: NativeMenuAction,
  ): MenuItemConstructorOptions => ({
    id,
    label,
    accelerator,
    click: () => dispatch(action),
  });

  // Windows already draws the application menu above web content. Keep every
  // app command there so the renderer does not create a second menu row.
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        command('file.new-section', 'New Section', 'Ctrl+N', 'new-section'),
        command(
          'file.choose-content-folder',
          'Choose Content Folder…',
          'Ctrl+O',
          'choose-content-folder',
        ),
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Workspace',
      submenu: [
        command('workspace.new', 'New Workspace…', 'Ctrl+Shift+N', 'new-workspace'),
        command('workspace.switch', 'Switch Workspace…', 'Ctrl+Shift+O', 'switch-workspace'),
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Revise',
          click: () =>
            void dialog.showMessageBox({
              type: 'info',
              title: 'About Revise',
              message: 'Revise',
              detail: `Version ${app.getVersion()}\nLocal Markdown workspaces`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
