import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      'codemirror-live-markdown': path.resolve(__dirname, '../dist/index.js'),
    },
  },
});
