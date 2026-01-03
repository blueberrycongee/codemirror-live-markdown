import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      'codemirror-live-markdown': path.resolve(__dirname, '../dist/index.js'),
      // Ensure all @codemirror/* packages use the same instance
      '@codemirror/state': path.resolve(__dirname, 'node_modules/@codemirror/state'),
      '@codemirror/view': path.resolve(__dirname, 'node_modules/@codemirror/view'),
      '@codemirror/language': path.resolve(__dirname, 'node_modules/@codemirror/language'),
      '@codemirror/lang-markdown': path.resolve(__dirname, 'node_modules/@codemirror/lang-markdown'),
      '@lezer/markdown': path.resolve(__dirname, 'node_modules/@lezer/markdown'),
    },
  },
});
