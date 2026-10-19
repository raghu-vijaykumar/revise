import { app, BrowserWindow, dialog } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { registerIpcRouter } from './ipc/router';

const rendererPath = join(__dirname, '../renderer/index.html');

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    title: 'Revise',
    backgroundColor: '#15171c',
    webPreferences: {
      // Privileged APIs stay in the preload, never in document or remote content.
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  void window.loadFile(rendererPath);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  return window;
}

app.whenReady().then(() => {
  registerIpcRouter(
    {
      'collection.chooseFolder': async () => {
        const choice = await dialog.showOpenDialog({
          title: 'Choose a content folder',
          properties: ['openDirectory', 'createDirectory'],
        });
        return choice.canceled ? null : (choice.filePaths[0] ?? null);
      },
    },
    pathToFileURL(rendererPath).href,
    () => {
      throw new Error('Workspace services are not registered yet');
    },
  );
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
