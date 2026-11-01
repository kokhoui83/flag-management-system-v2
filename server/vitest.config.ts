import { defineConfig } from 'vitest/config';

// Unit tier: pure functions and colocated unit tests (no Docker, no network).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.e2e.test.ts'],
  },
});
