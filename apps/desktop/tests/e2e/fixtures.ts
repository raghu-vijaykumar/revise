import {
  _electron as electron,
  test as base,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type DesktopFixtures = {
  desktopApp: ElectronApplication;
  desktopPage: Page;
  contentRoot: string;
};

const require = createRequire(import.meta.url);
const desktopPackage = resolve(import.meta.dirname, '../..');

export const test = base.extend<DesktopFixtures>({
  contentRoot: async ({}, use) => {
    const root = mkdtempSync(join(tmpdir(), 'revise-e2e-'));
    mkdirSync(join(root, 'Physics'));
    mkdirSync(join(root, 'Biology'));
    try {
      await use(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  desktopApp: async ({ contentRoot }, use) => {
    const app = await electron.launch({
      executablePath: require('electron') as string,
      args: [desktopPackage],
      env: { ...process.env, REVISE_TEST_CONTENT_ROOT: contentRoot },
    });
    try {
      await use(app);
    } finally {
      await app.close();
    }
  },
  desktopPage: async ({ desktopApp }, use) => {
    const page = await desktopApp.firstWindow();
    await use(page);
  },
});

export async function chooseFolderInNextNativeDialog(
  app: ElectronApplication,
  folder: string,
): Promise<void> {
  await app.evaluate(({ dialog }, selectedFolder) => {
    // Playwright cannot click an OS folder dialog; replace exactly one main-process call.
    const original = dialog.showOpenDialog;
    Object.defineProperty(dialog, 'showOpenDialog', {
      configurable: true,
      value: async () => {
        Object.defineProperty(dialog, 'showOpenDialog', { configurable: true, value: original });
        return { canceled: false, filePaths: [selectedFolder] };
      },
    });
  }, folder);
}

export { expect } from '@playwright/test';
