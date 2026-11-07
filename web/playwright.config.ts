import { defineConfig } from '@playwright/test';

// Browser E2E for the M4 dashboard — the adopted executable form of the M4 manual
// checklist (docs/05-testing.md §2.6, docs/06-roadmap.md M4). Runs against the docker
// compose stack that serves the built dashboard on :3000 (API + MariaDB + flagd + web/dist).
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
});
