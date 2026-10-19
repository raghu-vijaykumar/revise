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
  testRoot: string;
};

const require = createRequire(import.meta.url);
const desktopPackage = resolve(import.meta.dirname, '../..');

export const test = base.extend<DesktopFixtures>({
  testRoot: async ({}, use) => {
    const root = mkdtempSync(join(tmpdir(), 'revise-e2e-'));
    try {
      await use(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  contentRoot: async ({ testRoot }, use) => {
    const content = join(testRoot, 'content');
    mkdirSync(content);
    await use(content);
  },
  desktopApp: async ({ contentRoot, testRoot }, use) => {
    const userData = join(testRoot, 'user-data');
    mkdirSync(userData);
    const app = await electron.launch({
      executablePath: require('electron') as string,
      args: [desktopPackage],
      env: {
        ...process.env,
        REVISE_TEST_CONTENT_ROOT: contentRoot,
        REVISE_TEST_USER_DATA: userData,
      },
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
