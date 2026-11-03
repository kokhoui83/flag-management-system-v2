import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MariaDbContainer, type StartedMariaDbContainer } from '@testcontainers/mariadb';
import { createPrismaClient } from '../src/db';
import { createStore, type Store } from '../src/store';
import { createApp } from '../src/app';
import { loadConfig, type AppConfig } from '../src/config';
import type { FastifyInstance } from 'fastify';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('M1 — Flags & definitions core (integration: MariaDB via testcontainers)', () => {
  let container: StartedMariaDbContainer;
  let prisma: ReturnType<typeof createPrismaClient>;
  let store: Store;
  let app: FastifyInstance;
  let config: AppConfig;

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
    store = createStore(prisma);
    config = loadConfig({ NODE_ENV: 'development', DATABASE_URL: process.env.DATABASE_URL! });
    app = await createApp(config, { store });
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

  async function createProject(token: string, key: string, name: string) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { key, name },
    });
    return { status: response.statusCode, body: response.json() };
  }

  it('rejects unauthenticated access to managed routes with 401 problem+json', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/projects' });
    expect(response.statusCode).toBe(401);
    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(response.json().type).toContain('unauthorized');
  });

  it('logs the bootstrap admin in and rejects bad credentials', async () => {
    const token = await adminToken();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'wrong' },
    });
    expect(bad.statusCode).toBe(401);
  });

  it('creates projects, flags, definitions with version semantics, audit, and deletes', async () => {
    const token = await adminToken();

    const created = await createProject(token, 'checkout', 'Checkout');
    expect(created.status).toBe(201);
    const projectId = created.body.id;

    const duplicate = await createProject(token, 'checkout', 'Checkout Again');
    expect(duplicate.status).toBe(409);

    // Flag create (FR-1/FR-3/FR-56) -> version starts at 1.
    const flagCreate = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { key: 'new-checkout', description: 'Checkout v2 rollout' },
    });
    expect(flagCreate.statusCode).toBe(201);
    expect(flagCreate.json().version).toBe(1);

    const badKey = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { key: '9bad!' },
    });
    expect(badKey.statusCode).toBe(400);
    expect(badKey.json().errors[0].pointer).toBe('/key');

    // Definition PUT (FR-5/FR-14): create bumps flag version; idempotent put does not.
    const putDef = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    });
    expect(putDef.statusCode).toBe(200);
    expect(putDef.json().version).toBe(2);

    const putAgain = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    });
    expect(putAgain.statusCode).toBe(200);
    expect(putAgain.json().version).toBe(2);

    const putChanged = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled: false,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    });
    expect(putChanged.statusCode).toBe(200);
    expect(putChanged.json().version).toBe(3);

    // All-at-once validation (FR-14).
    const invalidPut = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'maybe',
        rules: [
          { type: 'attribute', conditions: [{ attribute: 'plan', op: 'gt', value: 'pro' }], variant: 'yes' },
        ],
      },
    });
    expect(invalidPut.statusCode).toBe(400);
    expect(invalidPut.json().errors.length).toBeGreaterThan(1);

    // FR-39: an audit write failure aborts the mutation (BEFORE INSERT trigger seam).
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER audit_write_fail BEFORE INSERT ON audit_logs FOR EACH ROW BEGIN SET NEW.entity_id = NULL; END;',
    );
    const putFail = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    });
    expect(putFail.statusCode).toBe(500);
    const versionAfterFail = (await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/flags/new-checkout`,
      headers: { authorization: `Bearer ${token}` },
    })).json();
    expect(versionAfterFail.version).toBe(3);
    await prisma.$executeRawUnsafe('DROP TRIGGER audit_write_fail');

    // Audit read (FR-38).
    const audit = await app.inject({
      method: 'GET',
      url: `/api/v1/audit?limit=200&entity=definition&actor=admin`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(audit.statusCode).toBe(200);
    const auditBody = audit.json();
    expect(auditBody.entries.length).toBeGreaterThan(0);
    expect(auditBody.entries[0].action).toBe('definition.update');

    // Copy from an environment with no definition → 404 (not 400) (FR-9 / §2.5).
    const copyNoSource = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging/copy`,
      headers: { authorization: `Bearer ${token}` },
      payload: { fromEnv: 'prod' },
    });
    expect(copyNoSource.statusCode).toBe(404);

    // PUT definition for an unknown flag → 404 (no implicit flag creation) (FR-14 / §2.5).
    const putUnknown = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/does-not-exist/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [],
      },
    });
    expect(putUnknown.statusCode).toBe(404);

    // Delete flag (FR-4) → 204, then 404.
    const del = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/flags/new-checkout`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(del.statusCode).toBe(204);
    const delAgain = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/flags/new-checkout`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(delAgain.statusCode).toBe(404);
  });

  it('creates scoped API keys; manage gates flag writes, evaluate/sync are split', async () => {
    const token = await adminToken();
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/api-keys',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'flagd-sync', scope: 'sync' },
    });
    expect(created.statusCode).toBe(201);
    const plaintext: string = created.json().key;
    expect(plaintext).toMatch(/^fms_/);

    const listKeys = await app.inject({
      method: 'GET',
      url: '/api/v1/api-keys',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listKeys.statusCode).toBe(200);
    const keysBody = listKeys.json();
    const syncEntry = keysBody.keys.find((k) => k.name === 'flagd-sync');
    expect(syncEntry).toBeDefined();
    expect(syncEntry.keyPrefix).toMatch(/^fms_[A-Za-z0-9]{4}$/);

    const syncUse = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${plaintext}` },
    });
    expect(syncUse.statusCode).toBe(403);

    const managed = await app.inject({
      method: 'POST',
      url: '/api/v1/api-keys',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'admin-tool', scope: 'manage' },
    });
    expect(managed.statusCode).toBe(201);
    const manageToken: string = managed.json().key;
    const manageUse = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${manageToken}` },
    });
    expect(manageUse.statusCode).toBe(200);

    const revoked = await app.inject({
      method: 'DELETE',
      url: `/api/v1/api-keys/${created.json().id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(revoked.statusCode).toBe(204);

    const revokedUse = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${plaintext}` },
    });
    expect(revokedUse.statusCode).toBe(401);
  });

  it('invite flow: invited developer gets temp password, scoped access, and 403 off-assignment', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'payments', 'Payments');
    const projectId = created.body.id;

    const invite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: { username: 'brian', role: 'developer', projectIds: [projectId] },
    });
    expect(invite.statusCode).toBe(201);
    const tempPassword: string = invite.json().password;
    expect(typeof tempPassword).toBe('string');
    expect(tempPassword).toMatch(/^temp-/);

    const brianToken = await login('brian', tempPassword);

    // Assigned project: can create a flag.
    const brianFlag = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${brianToken}` },
      payload: { key: 'new-payment', description: 'Payments v2' },
    });
    expect(brianFlag.statusCode).toBe(201);

    // Unassigned project: 403 (FR-58).
    const other = await createProject(token, 'billing', 'Billing');
    const brianOther = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${other.body.id}/flags`,
      headers: { authorization: `Bearer ${brianToken}` },
      payload: { key: 'nope' },
    });
    expect(brianOther.statusCode).toBe(403);
  });
});
