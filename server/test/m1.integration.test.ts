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

    // FR-36 / docs/03-data-model.md §5: successful logins are audited as `auth.login`
    // (entity `auth`, success only); failed logins add no entry.
    const loginAudit = await app.inject({
      method: 'GET',
      url: '/api/v1/audit?action=auth.login&actor=admin&limit=10',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(loginAudit.statusCode).toBe(200);
    const loginAuditEntries = loginAudit.json().entries as Array<{ action: string; actorName: string }>;
    expect(loginAuditEntries.length).toBeGreaterThan(0);
    expect(loginAuditEntries[0].action).toBe('auth.login');
    expect(loginAuditEntries[0].actorName).toBe('admin');
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

    // FR-34 / FR-36 / docs/03-data-model.md §5: API-key creation and revocation are audited.
    const keyCreateAudit = await app.inject({
      method: 'GET',
      url: '/api/v1/audit?action=api_key.create&actor=admin&limit=10',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(keyCreateAudit.statusCode).toBe(200);
    const keyCreateAuditEntries = keyCreateAudit.json().entries as Array<{ action: string; entity: string }>;
    expect(keyCreateAuditEntries.length).toBeGreaterThan(0);
    expect(keyCreateAuditEntries[0].action).toBe('api_key.create');
    expect(keyCreateAuditEntries[0].entity).toBe('api_key');

    const keyRevokeAudit = await app.inject({
      method: 'GET',
      url: '/api/v1/audit?action=api_key.revoke&actor=admin&limit=10',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(keyRevokeAudit.statusCode).toBe(200);
    const keyRevokeAuditEntries = keyRevokeAudit.json().entries as Array<{ action: string; entity: string }>;
    expect(keyRevokeAuditEntries.length).toBeGreaterThan(0);
    expect(keyRevokeAuditEntries[0].action).toBe('api_key.revoke');
    expect(keyRevokeAuditEntries[0].entity).toBe('api_key');

    // FR-34: revoking a nonexistent API key is a clean 404, not a 500 from the Prisma update.
    const revokeMissing = await app.inject({
      method: 'DELETE',
      url: '/api/v1/api-keys/does-not-exist',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(revokeMissing.statusCode).toBe(404);
  });

  it('invite flow: invited developer gets temp password, scoped access, and 403 off-assignment', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'payments', 'Payments');
    const projectId = created.body.id;

    const invite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: { username: 'brian', role: 'developer', projects: [{ projectId, role: 'developer' }] },
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

  it('enforces the product-owner capability matrix: enabled-only toggle allowed, create/edit/copy/delete/environment blocked (FR-59/FR-54/FR-58/FR-57)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'po-matrix', 'Po Matrix');
    expect(created.status).toBe(201);
    const projectId = created.body.id;

    const flagCreate = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { key: 'new-thing', description: 'Po matrix flag' },
    });
    expect(flagCreate.statusCode).toBe(201);

    const putDef = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-thing/definitions/dev`,
      headers: { authorization: `Bearer ${token}` },
      payload: { enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
    });
    expect(putDef.statusCode).toBe(200);
    expect(putDef.json().version).toBe(2);

    const invite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: { username: 'po-tester', role: 'product-owner', projects: [{ projectId, role: 'product-owner' }] },
    });
    expect(invite.statusCode).toBe(201);
    const poToken = await login('po-tester', invite.json().password);

    // A product owner may not change variants/rules/defaults (FR-59) → 403, version must not bump.
    const poVariantPut = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-thing/definitions/dev`,
      headers: { authorization: `Bearer ${poToken}` },
      payload: { enabled: true, variants: { on: true, off: false }, defaultVariant: 'on', rules: [] },
    });
    expect(poVariantPut.statusCode).toBe(403);

    // A product owner may toggle `enabled` only → 200, version bumps, audited as definition.update.
    const poToggle = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-thing/definitions/dev`,
      headers: { authorization: `Bearer ${poToken}` },
      payload: { enabled: false, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
    });
    expect(poToggle.statusCode).toBe(200);
    expect(poToggle.json().version).toBe(3);

    // A product owner may not create flags, edit descriptions, copy, delete, or create environments.
    const poFlagCreate = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${poToken}` },
      payload: { key: 'nope', description: 'nope' },
    });
    expect(poFlagCreate.statusCode).toBe(403);

    const poDescUpdate = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-thing`,
      headers: { authorization: `Bearer ${poToken}` },
      payload: { description: 'hacked' },
    });
    expect(poDescUpdate.statusCode).toBe(403);

    const poCopy = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags/new-thing/definitions/dev/copy`,
      headers: { authorization: `Bearer ${poToken}` },
      payload: { fromEnv: 'staging' },
    });
    expect(poCopy.statusCode).toBe(403);

    const poDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/flags/new-thing`,
      headers: { authorization: `Bearer ${poToken}` },
    });
    expect(poDelete.statusCode).toBe(403);

    const poEnvCreate = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/environments`,
      headers: { authorization: `Bearer ${poToken}` },
      payload: { env: 'qa' },
    });
    expect(poEnvCreate.statusCode).toBe(403);
  });

  it('lets an assigned developer create flags/environments and put definitions, but not delete (FR-54/FR-58/FR-57)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'dev-matrix', 'Dev Matrix');
    expect(created.status).toBe(201);
    const projectId = created.body.id;

    const devInvite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: { username: 'dev-tester', role: 'developer', projects: [{ projectId, role: 'developer' }] },
    });
    expect(devInvite.statusCode).toBe(201);
    const devToken = await login('dev-tester', devInvite.json().password);

    const devFlag = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${devToken}` },
      payload: { key: 'dev-thing', description: 'Dev matrix flag' },
    });
    expect(devFlag.statusCode).toBe(201);

    const devEnv = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/environments`,
      headers: { authorization: `Bearer ${devToken}` },
      payload: { env: 'qa' },
    });
    expect(devEnv.statusCode).toBe(201);

    const devPut = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/dev-thing/definitions/dev`,
      headers: { authorization: `Bearer ${devToken}` },
      payload: { enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
    });
    expect(devPut.statusCode).toBe(200);

    const devDelete = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}/flags/dev-thing`,
      headers: { authorization: `Bearer ${devToken}` },
    });
    expect(devDelete.statusCode).toBe(403);
  });

  it('resolves effective permissions as the union of global and per-project roles (FR-54) — project-scoped admin elevation', async () => {
    const token = await adminToken();
    const unionA = await createProject(token, 'union-a', 'Union A');
    expect(unionA.status).toBe(201);
    const unionB = await createProject(token, 'union-b', 'Union B');
    expect(unionB.status).toBe(201);
    const aId = unionA.body.id;
    const bId = unionB.body.id;

    const invite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${aId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        username: 'elevator',
        role: 'developer',
        projects: [
          { projectId: aId, role: 'admin' },
          { projectId: bId, role: 'developer' },
        ],
      },
    });
    expect(invite.statusCode).toBe(201);
    const elevatorToken = await login('elevator', invite.json().password);

    const flagA = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${aId}/flags`,
      headers: { authorization: `Bearer ${elevatorToken}` },
      payload: { key: 'elev-flag', description: 'Elev flag' },
    });
    expect(flagA.statusCode).toBe(201);
    const delA = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${aId}/flags/elev-flag`,
      headers: { authorization: `Bearer ${elevatorToken}` },
    });
    expect(delA.statusCode).toBe(204);

    const flagB = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${bId}/flags`,
      headers: { authorization: `Bearer ${elevatorToken}` },
      payload: { key: 'elev-flag-b', description: 'Elev flag B' },
    });
    expect(flagB.statusCode).toBe(201);
    const delB = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${bId}/flags/elev-flag-b`,
      headers: { authorization: `Bearer ${elevatorToken}` },
    });
    expect(delB.statusCode).toBe(403);
  });

  it('records the authenticated actor on the project.environment.create audit entry (FR-36)', async () => {
    const token = await adminToken();
    const created = await createProject(token, 'audit-actor', 'Audit Actor');
    expect(created.status).toBe(201);
    const projectId = created.body.id;

    const devInvite = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/members`,
      headers: { authorization: `Bearer ${token}` },
      payload: { username: 'audit-dev', role: 'developer', projects: [{ projectId, role: 'developer' }] },
    });
    expect(devInvite.statusCode).toBe(201);
    const devToken = await login('audit-dev', devInvite.json().password);

    const envCreate = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/environments`,
      headers: { authorization: `Bearer ${devToken}` },
      payload: { env: 'qa' },
    });
    expect(envCreate.statusCode).toBe(201);

    const audit = await app.inject({
      method: 'GET',
      url: `/api/v1/audit?action=project.environment.create&actor=audit-dev&limit=10`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(audit.statusCode).toBe(200);
    const entries = audit.json().entries as Array<{ action: string; actorName: string }>;
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].action).toBe('project.environment.create');
    expect(entries[0].actorName).toBe('audit-dev');
  });
});
