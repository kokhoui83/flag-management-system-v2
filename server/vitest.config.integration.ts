import { defineConfig } from 'vitest/config';

// Integration tier: routes/middleware against the Fastify app with a real MariaDB
// (testcontainers); unit tests in src/ run here too since they need no Docker.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.e2e.test.ts'],
  },
});
