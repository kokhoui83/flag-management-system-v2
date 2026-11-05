import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config';
import { createApp } from './app';
import { createPrismaClient, closePrismaClient } from './db';
import { createStore, type Store } from './store';
import { FlagdModelMemo } from './sync/model-memo';
import { OpenFeature } from '@openfeature/server-sdk';
import { FlagdProviderRegistry } from './evaluate/providers';
import { OpenFeatureFlagEvaluator } from './evaluate/evaluator';
import { InMemoryFlagChangeBroadcaster } from './events/broadcaster';

const config = loadConfig();

const prisma = createPrismaClient(config.databaseUrl);
const memo = new FlagdModelMemo();
const store: Store = createStore(prisma, { memo });
const registry = new FlagdProviderRegistry({ openFeature: () => OpenFeature, flagd: { host: config.flagdHost, port: config.flagdPort } });
const broadcaster = new InMemoryFlagChangeBroadcaster();
const evaluator = new OpenFeatureFlagEvaluator({ openFeature: () => OpenFeature, registry });

// Boot-time migrations (ADR-0007 / Prisma migrate): fail fast if the schema cannot be applied.
// The Prisma config + schema live at the repo root (npm workspaces); run from there so the
// datasource URL from prisma.config.ts is picked up, whatever the process working directory is.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
execSync('npx prisma migrate deploy', { cwd: repoRoot, stdio: 'inherit', env: process.env });

const app = await createApp(config, { store, evaluator, registry, broadcaster });
// Materialize one flagd provider per known flag set at boot (FR-24): `/readyz` and evaluation
// resolve through these bindings; with an empty database there is nothing to bind yet.
for (const flagSet of await store.listFlagSets()) {
  await registry.getOrCreate(flagSet.flagSetId);
}
await app.listen({ port: config.port });

// Architecture §9: on first boot with an empty DB, log the sync key once so the operator can
// wire `flagd/config.yaml` (source URIs per the OQ-6 resolution).
if ((await store.listFlagSets()).length === 0) {
  app.log.info(
    { syncKey: config.syncKey },
    'SYNC_KEY (first boot with an empty database): wire it into flagd/config.yaml sources authHeader',
  );
}

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
