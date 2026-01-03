import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Use jsdom for DOM-dependent tests (ViewPlugin, etc.)
    exclude: ['node_modules', 'dist', 'demo', 'ProseMark'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'demo/', 'ProseMark/']
    }
  }
});
