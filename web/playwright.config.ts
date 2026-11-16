import { defineConfig } from '@playwright/test';

// Browser E2E for the dashboard (docs/05-testing.md §2.6, docs/06-roadmap.md M4/M4.5): real UI
// journeys against a running API that serves the built dashboard, an isolated MariaDB and a
// flagd syncing the `checkout` project. `npm run test:e2e:web:stack` (web/e2e/stack/stack.mjs)
// provisions that stack, runs this suite and tears it down again.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
});
