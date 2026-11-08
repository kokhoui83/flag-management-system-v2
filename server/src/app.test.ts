import { describe, it, expect } from 'vitest';
import { createApp } from './app';
import { loadConfig } from './config';
import type { Store } from './store';

/**
 * Minimal store stub for the health surface: the database probe reports `DOWN` (no DB in
 * the unit tier) and no flag sets are registered, so readiness stays `not_ready` without
 * touching a real database (NFR-8 — Docker-free unit tier).
 */
const stubStore = {
  pingDatabase: async (): Promise<'OK' | 'DOWN'> => 'DOWN',
  listFlagSets: async (): Promise<Array<{ flagSetId: string; projectKey: string; env: string }>> => [],
} as unknown as Store;

describe('health routes (M0, M3 readiness)', () => {
  it('GET /healthz → 200 {"status":"ok"} without auth', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }));

    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('GET /readyz → 503 {"status":"not_ready"} while provider wiring is absent (M0/M3)', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }), { store: stubStore });

    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe('not_ready');
  });

  it('GET / (dashboard SPA entry) is not auth-gated — the login view handles unauthenticated visitors', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }));

    const response = await app.inject({ method: 'GET', url: '/' });

    expect(response.statusCode).not.toBe(401);
  });
});
