import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node instead of jsdom - we don't need DOM for these tests
    exclude: ['node_modules', 'dist', 'demo', 'ProseMark'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'demo/', 'ProseMark/']
    }
  }
});
