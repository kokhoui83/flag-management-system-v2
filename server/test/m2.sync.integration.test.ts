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
import type { FastifyInstance } from 'fastify';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('M2 — flagd model compilation & sync endpoint (integration: MariaDB via testcontainers)', () => {
  let container: StartedMariaDbContainer;
  let prisma: ReturnType<typeof createPrismaClient>;
  let store: Store;
  let app: FastifyInstance;
  let config: AppConfig;
  let memo: FlagdModelMemo;

  beforeAll(async () => {
    container = new MariaDbContainer('mariadb:11.8')
      .withDatabase('fms_test')
      .withUsername('fms')
      .withUserPassword('fms')
      .withRootPassword('root');
    const started = await container.start();
    container = started;
    process.env.DATABASE_URL =
      `mysql://${started.getUsername()}:${started.getUserPassword()}@${started.getHost()}:${started.getPort()}/${started.getDatabase()}`;
    execSync('npx prisma migrate deploy', { cwd: repoRoot, stdio: 'inherit', env: process.env });
    prisma = createPrismaClient(process.env.DATABASE_URL!);
    memo = new FlagdModelMemo();
    store = createStore(prisma, { memo });
    config = loadConfig({ NODE_ENV: 'development', DATABASE_URL: process.env.DATABASE_URL! });
    app = await createApp(config, { store, memo });
  }, 900_000);

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    await container.stop();
  });

  async function login(username: string, password: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username, password },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    return body.token;
  }

  async function adminToken(): Promise<string> {
    return login('admin', 'dev-insecure-password');
  }

  function authHeader(token: string): string {
    return ['Bearer', token].join(' ');
  }

  async function createProject(token: string, key: string, name: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { key, name },
    });
    return { status: response.statusCode, body: response.json() };
  }

  async function createFlag(token: string, projectId: string, key: string, description: string) {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { key, description },
    });
    return response;
  }

  async function putDefinition(
    token: string,
    projectId: string,
    flagKey: string,
    env: string,
    enabled: boolean,
  ) {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/${flagKey}/definitions/${env}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    });
    return response;
  }

  async function createApiKey(token: string, name: string, scope: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/api-keys',
      headers: { authorization: `Bearer ${token}` },
      payload: { name, scope },
    });
    expect(response.statusCode).toBe(201);
    return response.json().key as string;
  }

  it('serves the compiled flagd model for an authorized sync caller with a stable ETag (FR-26/FR-27)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'flagd-sync', 'Flagd Sync');
    expect(created.status).toBe(201);
    const projectId = created.body.id;

    const flag = await createFlag(token, projectId, 'new-checkout', 'Checkout v2 rollout');
    expect(flag.statusCode).toBe(201);
    const putDef = await putDefinition(token, projectId, 'new-checkout', 'staging', true);
    expect(putDef.statusCode).toBe(200);
    expect(putDef.json().version).toBe(2);

    const sync = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync/staging',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(sync.statusCode).toBe(200);
    expect(sync.headers.etag).toMatch(/^"fms-[a-f0-9]+"$/);
    const body = sync.json();
    expect(body.metadata.flagSetId).toBe('flagd-sync:staging');
    expect(body.metadata.generator).toBe('fms');
    expect(body.flags['new-checkout'].state).toBe('ENABLED');
    expect(body.flags['new-checkout'].metadata.version).toBe(2);
    expect(body.flags['new-checkout'].targeting).toBeUndefined();
  });

  it('returns 304 with the current ETag when If-None-Match matches, and 200 with a fresh ETag otherwise (FR-26/FR-28)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'flagd-sync-304', 'Flagd Sync 304');
    const projectId = created.body.id;
    const flag = await createFlag(token, projectId, 'new-checkout', 'Checkout v2 rollout');
    expect(flag.statusCode).toBe(201);
    const putDef = await putDefinition(token, projectId, 'new-checkout', 'staging', true);
    expect(putDef.statusCode).toBe(200);

    const first = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(first.statusCode).toBe(200);
    const etag = first.headers.etag as string;

    const notModified = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: `Bearer ${token}`, 'if-none-match': etag },
    });
    expect(notModified.statusCode).toBe(304);
    expect(notModified.headers.etag).toBe(etag);

    const weakMatch = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: authHeader(token), 'if-none-match': 'W/' + etag },
    });
    expect(weakMatch.statusCode).toBe(304);

    const listMatch = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: authHeader(token), 'if-none-match': '"other", ' + etag },
    });
    expect(listMatch.statusCode).toBe(304);

    const wildcardMatch = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: authHeader(token), 'if-none-match': '*' },
    });
    expect(wildcardMatch.statusCode).toBe(304);

    const stale = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: authHeader(token), 'if-none-match': 'fms-stale' },
    });
    expect(stale.statusCode).toBe(200);

    const malformed = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync-304/staging',
      headers: { authorization: authHeader(token), 'if-none-match': 'malformed ' + etag },
    });
    expect(malformed.statusCode).toBe(200);
  });

  it('returns 404 for an unknown project or environment on the sync endpoint', async () => {
    const token = await adminToken();
    const syncUnknownProject = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/does-not-exist/staging',
      headers: { authorization: authHeader(token) },
    });
    expect(syncUnknownProject.statusCode).toBe(404);

    const syncUnknownEnv = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync/qa',
      headers: { authorization: authHeader(token) },
    });
    expect(syncUnknownEnv.statusCode).toBe(404);
  });

  it('rejects sync calls without the sync scope (evaluate-only key → 403; sync key → 200) (FR-27)', async () => {
    const token = await adminToken();

    const evaluateKey = await createApiKey(token, 'm2-evaluate', 'evaluate');
    const evaluateSync = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync/staging',
      headers: { authorization: authHeader(evaluateKey) },
    });
    expect(evaluateSync.statusCode).toBe(403);

    const syncKey = await createApiKey(token, 'm2-sync', 'sync');
    const syncOk = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/flagd-sync/staging',
      headers: { authorization: authHeader(syncKey) },
    });
    expect(syncOk.statusCode).toBe(200);
  });

  it('limits project-scoped admin sessions to their assigned project on sync', async () => {
    const token = await adminToken();
    const assigned = await createProject(token, 'sync-assigned', 'Sync Assigned');
    await createProject(token, 'sync-unassigned', 'Sync Unassigned');
    const invite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${assigned.body.id}/members`,
      headers: { authorization: authHeader(token) },
      payload: {
        username: 'sync-project-admin',
        role: 'developer',
        projects: [{ projectId: assigned.body.id, role: 'admin' }],
      },
    });
    expect(invite.statusCode).toBe(201);
    await prisma.projectMembership.update({
      where: { userName_projectId: { userName: 'sync-project-admin', projectId: assigned.body.id } },
      data: { role: 'ADMIN' },
    });
    const scopedAdminToken = await login('sync-project-admin', invite.json().password);

    const assignedSync = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/sync-assigned/staging',
      headers: { authorization: authHeader(scopedAdminToken) },
    });
    expect(assignedSync.statusCode).toBe(200);

    const unassignedSync = await app.inject({
      method: 'GET',
      url: `/api/v1/sync/sync-unassigned/staging`,
      headers: { authorization: authHeader(scopedAdminToken) },
    });
    expect(unassignedSync.statusCode).toBe(403);
  });

  it('refreshes the sync model after copying or deleting a definition when another flag holds the max version', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'sync-invalidation', 'Sync Invalidation');
    const projectId = created.body.id;
    expect((await createFlag(token, projectId, 'copied-flag', 'Copied flag')).statusCode).toBe(201);
    expect((await putDefinition(token, projectId, 'copied-flag', 'dev', true)).statusCode).toBe(200);

    expect((await createFlag(token, projectId, 'max-version-flag', 'Version keeper')).statusCode).toBe(201);
    expect((await putDefinition(token, projectId, 'max-version-flag', 'staging', true)).statusCode).toBe(200);
    expect((await putDefinition(token, projectId, 'max-version-flag', 'prod', true)).statusCode).toBe(200);

    const initial = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/sync-invalidation/staging',
      headers: { authorization: authHeader(token) },
    });
    expect(initial.statusCode).toBe(200);
    expect(initial.json().flags['copied-flag']).toBeUndefined();

    const copied = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags/copied-flag/definitions/staging/copy`,
      headers: { authorization: authHeader(token) },
      payload: { fromEnv: 'dev' },
    });
    expect(copied.statusCode).toBe(200);

    const afterCopy = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/sync-invalidation/staging',
      headers: { authorization: authHeader(token), 'if-none-match': initial.headers.etag as string },
    });
    expect(afterCopy.statusCode).toBe(200);
    expect(afterCopy.json().flags['copied-flag'].state).toBe('ENABLED');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/flags/copied-flag`,
      headers: { authorization: authHeader(token) },
    });
    expect(deleted.statusCode).toBe(204);

    const afterDelete = await app.inject({
      method: 'GET',
      url: '/api/v1/sync/sync-invalidation/staging',
      headers: { authorization: authHeader(token), 'if-none-match': afterCopy.headers.etag as string },
    });
    expect(afterDelete.statusCode).toBe(200);
    expect(afterDelete.json().flags['copied-flag']).toBeUndefined();
  });
});
