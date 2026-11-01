import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config';
import { createApp } from './app';
import { closePrismaClient, createPrismaClient } from './db';

const config = loadConfig();

const prisma = createPrismaClient(config.databaseUrl);

// Boot-time migrations (ADR-0007 / Prisma migrate): fail fast if the schema cannot be applied.
// The Prisma config + schema live at the repo root (npm workspaces); run from there so the
// datasource URL from prisma.config.ts is picked up, whatever the process working directory is.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
execSync('npx prisma migrate deploy', { cwd: repoRoot, stdio: 'inherit', env: process.env });

const app = await createApp(config);
await app.listen({ port: config.port });

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  app.log.info({ signal }, 'shutdown: close connections');
  await app.close();
  await closePrismaClient(prisma);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
