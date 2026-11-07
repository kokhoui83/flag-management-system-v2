import { describe, it, expect } from 'vitest';
import { createApp } from '../app';
import { loadConfig } from '../config';
import type { Store } from '../store';

/**
 * Minimal store stub for the auth surface: the DB probe reports `DOWN` (no DB in the unit
 * tier), and the user lookups back the bootstrap-admin session identity (FR-53).
 */
const stubStore = {
  pingDatabase: async (): Promise<'OK' | 'DOWN'> => 'DOWN',
  listFlagSets: async (): Promise<
    Array<{ flagSetId: string; projectKey: string; env: string }>
  > => [],
  recordAuthLogin: async (): Promise<void> => {},
  findUserByName: async (userName: string) =>
    userName === 'admin'
      ? {
          userName,
          passwordHash: 'stub',
          globalRole: 'ADMIN',
          createdAt: new Date(),
        }
      : null,
  findMembership: async () => null,
  listMemberAssignments: async () => [],
} as unknown as Store;

describe('GET /api/v1/auth/session (M4 dashboard identity surface)', () => {
  it('returns 401 problem+json without a credential', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }), {
      store: stubStore,
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/session',
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns the bootstrap admin identity after login (FR-31 / FR-53)', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }), {
      store: stubStore,
    });
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'dev-insecure-password' },
    });
    expect(login.statusCode).toBe(200);
    const token = (login.json() as { token: string }).token as string;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/session',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().username).toBe('admin');
    expect(response.json().globalRole).toBe('admin');
    expect(response.json().isBootstrapAdmin).toBe(true);
  }, 20000);
});
