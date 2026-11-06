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

describe('M3 — evaluation path & readiness (integration: MariaDB via testcontainers)', () => {
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

  async function createApiKey(token: string, name: string, scope: string) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/api-keys', headers: { authorization: `Bearer ${token}` }, payload: { name, scope } });
    expect(response.statusCode).toBe(201);
    return response.json().key as string;
  }

  it('GET /readyz reports the not-ready state while the flagd provider is uninitialized (M3 readiness)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'm3-readyz', 'M3 Readyz');
    const flag = await createFlag(token, created.body.id, 'new-checkout', 'Checkout');
    expect(flag.statusCode).toBe(201);
    const put = await putDefinition(token, created.body.id, 'new-checkout', 'staging', true);
    expect(put.statusCode).toBe(200);

    const response = await app.inject({ method: 'GET', url: '/readyz', headers: { authorization: `Bearer ${token}` } });
    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe('not_ready');
    expect(response.json().flagd['m3-readyz:staging']).toBeDefined();
  });

  it('POST /api/v1/evaluate → 401 without a credential, 400 for an unknown environment, 404 for an unknown flag, 503 not_ready when flagd is down', async () => {
    const token = await adminToken();

    const unauthenticated = await app.inject({ method: 'POST', url: '/api/v1/evaluate', payload: { projectKey: 'nope', flagKey: 'nope', environment: 'dev' } });
    expect(unauthenticated.statusCode).toBe(401);

    const badEnv = await app.inject({ method: 'POST', url: '/api/v1/evaluate', headers: { authorization: `Bearer ${token}` }, payload: { projectKey: 'm3-readyz', flagKey: 'new-checkout', environment: 'does-not-exist' } });
    expect(badEnv.statusCode).toBe(400);

    const unknownFlag = await app.inject({ method: 'POST', url: '/api/v1/evaluate', headers: { authorization: `Bearer ${token}` }, payload: { projectKey: 'm3-readyz', flagKey: 'no-such-flag', environment: 'staging' } });
    expect(unknownFlag.statusCode).toBe(404);

    const notReady = await app.inject({
      method: 'POST',
      url: '/api/v1/evaluate',
      headers: { authorization: `Bearer ${token}` },
      payload: { projectKey: 'm3-readyz', flagKey: 'new-checkout', environment: 'staging', context: { email: 'user42@acme.com' } },
    });
    expect(notReady.statusCode).toBe(503);
  });

  it('GET /api/v1/projects/:projectId/flags/:key/observed requires the evaluate surface and probes per environment', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'm3-observed', 'M3 Observed');
    const flag = await createFlag(token, created.body.id, 'new-checkout', 'Checkout');
    expect(flag.statusCode).toBe(201);
    await putDefinition(token, created.body.id, 'new-checkout', 'dev', true);

    const forbidden = await app.inject({ method: 'GET', url: `/api/v1/projects/${created.body.id}/flags/new-checkout/observed`, headers: { authorization: `Bearer ${await createApiKey(token, 'm3-observed-key', 'manage')}` } });
    expect(forbidden.statusCode).toBe(403);

    const notReady = await app.inject({ method: 'GET', url: `/api/v1/projects/${created.body.id}/flags/new-checkout/observed`, headers: { authorization: `Bearer ${token}` } });
    expect(notReady.statusCode).toBe(503);
  });

  it('GET /api/v1/events rejects an unknown ?envs= flag set id with 400', async () => {
    const token = await adminToken();
    const response = await app.inject({ method: 'GET', url: '/api/v1/events?envs=unknown-flag-set', headers: { authorization: `Bearer ${token}` } });
    expect(response.statusCode).toBe(400);
  });

  it('does not queue a flag-changed change for an idempotent definition put (FR-51)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'm3-events-dedup', 'M3 Events Dedup');
    const flag = await createFlag(token, created.body.id, 'new-checkout', 'Checkout');
    expect(flag.statusCode).toBe(201);

    const first = await putDefinition(token, created.body.id, 'new-checkout', 'staging', true);
    expect(first.statusCode).toBe(200);
    expect(broadcaster.queued('m3-events-dedup:staging')).toHaveLength(1);

    const second = await putDefinition(token, created.body.id, 'new-checkout', 'staging', true);
    expect(second.statusCode).toBe(200);
    // The identical second PUT is an idempotent no-op (version must not bump) and must not
    // re-queue a change event for the SSE stream to drain.
    expect(broadcaster.queued('m3-events-dedup:staging')).toHaveLength(1);
  });
});
