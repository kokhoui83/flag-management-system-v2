import { describe, it, expect } from 'vitest';
import { createApp } from './app';
import { loadConfig } from './config';

describe('health routes (M0)', () => {
  it('GET /healthz → 200 {"status":"ok"} without auth', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }));

    const response = await app.inject({ method: 'GET', url: '/healthz' });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe('ok');
  });

  it('GET /readyz → 503 {"status":"not_ready"} while provider wiring is absent (M0)', async () => {
    const app = await createApp(loadConfig({ NODE_ENV: 'development' }));

    const response = await app.inject({ method: 'GET', url: '/readyz' });

    expect(response.statusCode).toBe(503);
    expect(response.json().status).toBe('not_ready');
  });
});
