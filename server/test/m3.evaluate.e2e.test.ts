import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';
import { createPrismaClient } from '../src/db';
import { createStore, type Store } from '../src/store';
import { createApp } from '../src/app';
import { loadConfig, type AppConfig } from '../src/config';
import { FlagdModelMemo } from '../src/sync/model-memo';
import { InMemoryFlagChangeBroadcaster } from '../src/events/broadcaster';
import { FlagdProviderRegistry } from '../src/evaluate/providers';
import { OpenFeatureFlagEvaluator } from '../src/evaluate/evaluator';
import { OpenFeature } from '@openfeature/server-sdk';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('M3 — flagd E2E (real engine via compose)', () => {
  let container: StartedMariaDbContainer;
  let prisma: ReturnType<typeof createPrismaClient>;
  let store: Store;
  let app: Awaited<ReturnType<typeof createApp>>;
  let config: AppConfig;
  let memo: FlagdModelMemo;
  const broadcaster = new InMemoryFlagChangeBroadcaster();

  beforeAll(async () => {
    container = new MariaDbContainer('mariadb:11.8')
      .withDatabase('fms_test')
      .withUsername('fms')
      .withUserPassword('fms')
      .withRootPassword('root');
    const started = await container.start();
    container = started;
    process.env.DATABASE_URL = `mysql://${started.getUsername()}:${started.getUserPassword()}@${started.getHost()}:${started.getPort()}/${started.getDatabase()}`;
    execSync('npx prisma migrate deploy', { cwd: repoRoot, stdio: 'inherit', env: process.env });
    prisma = createPrismaClient(process.env.DATABASE_URL!);
    memo = new FlagdModelMemo();
    store = createStore(prisma, { memo });
    const registry = new FlagdProviderRegistry({ openFeature: () => OpenFeature });
    const evaluator = new OpenFeatureFlagEvaluator({ openFeature: () => OpenFeature, registry });
    config = loadConfig({ NODE_ENV: 'development', DATABASE_URL: process.env.DATABASE_URL! });
    app = await createApp(config, { store, memo, evaluator, registry, broadcaster });
  }, 900_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await container.stop();
  });

  async function adminToken(): Promise<string> {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { username: 'admin', password: 'dev-insecure-password' } });
    expect(response.statusCode).toBe(200);
    return response.json().token;
  }

  async function createProject(token: string, key: string, name: string) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: { authorization: `Bearer ${token}` }, payload: { key, name } });
    expect(response.statusCode).toBe(201);
    return { status: response.statusCode, body: response.json() };
  }

  async function createFlag(token: string, projectId: string, key: string, description: string) {
    const response = await app.inject({ method: 'POST', url: `/api/v1/projects/${projectId}/flags`, headers: { authorization: `Bearer ${token}` }, payload: { key, description } });
    return response;
  }

  async function putDefinition(token: string, projectId: string, flagKey: string, env: string, enabled: boolean) {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/${flagKey}/definitions/${env}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
    });
    return response;
  }

  it('GET /readyz reports the not_ready state while the flagd provider is uninitialized', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'm3-e2e-readyz', 'M3 E2E Readyz');
    const flag = await createFlag(token, created.body.id, 'new-checkout', 'Checkout');
    expect(flag.statusCode).toBe(201);
    const put = await putDefinition(token, created.body.id, 'new-checkout', 'staging', true);
    expect(put.statusCode).toBe(200);

    const response = await app.inject({ method: 'GET', url: '/readyz' });
    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe('not_ready');
    expect(response.json().flagd['m3-e2e-readyz:staging']).toBeDefined();
  });
});
