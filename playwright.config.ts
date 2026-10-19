import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/desktop/tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list']],
  use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop-reference',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1760, height: 980 } },
    },
    {
      name: 'desktop-narrow',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
});
