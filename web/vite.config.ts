import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Dev server proxy: /api → management API (:3000) (architecture §10 dev loop).
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      // `@fms/shared` is the canonical rule/validation module consumed by server and dashboard
      // (ADR-0006): one source of truth, no per-side copies.
      {
        find: /^@fms\/shared$/,
        replacement: fileURLToPath(
          new URL('../shared/src/index.ts', import.meta.url),
        ),
      },
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
