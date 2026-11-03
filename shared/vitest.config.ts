import { defineConfig } from 'vitest/config';

// Shared workspace unit tier: pure domain validators, no Docker/network.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
