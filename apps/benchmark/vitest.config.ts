import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Unit specs live in `test/`. Playwright e2e specs live in `tests/` and are
    // run separately by `test:e2e`, so keep the two roots from overlapping.
    include: ['test/**/*.spec.ts'],
    exclude: ['node_modules', '.next', 'tests', ...configDefaults.exclude],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'app'),
    },
  },
});
