import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    {
      name: 'load-sql-schema',
      enforce: 'pre',
      load(id) {
        if (id.endsWith('.sql'))
          return `export default ${JSON.stringify(readFileSync(id, 'utf8'))}`;
        return undefined;
      },
    },
  ],
  test: {
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'apps/**/tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'packages/core/src/**/*.{ts,tsx}',
        'apps/desktop/src/main/**/*.{ts,tsx}',
        'apps/desktop/src/renderer/**/*.{ts,tsx}',
      ],
      // Bootstrap files only wire processes together; behavior is covered by UI smoke tests.
      exclude: ['**/*.d.ts', '**/src/index.ts', '**/src/main/index.ts', '**/src/renderer/main.tsx'],
      reporter: ['text-summary', 'lcov', 'json', 'html'],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});
