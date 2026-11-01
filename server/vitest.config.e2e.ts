import { defineConfig } from 'vitest/config';

// E2E tier: real flagd + MariaDB via docker compose (npm run test:e2e).
export default defineConfig({
  test: {
    include: ['test/**/*.e2e.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
