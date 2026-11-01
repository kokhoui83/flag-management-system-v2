import { describe, it, expect } from 'vitest';
import {
  loadConfig,
  INSECURE_DATABASE_URL,
  INSECURE_ADMIN_USERNAME,
  INSECURE_ADMIN_PASSWORD,
} from './config';

describe('config (architecture §9)', () => {
  it('applies development defaults', () => {
    const config = loadConfig({ NODE_ENV: 'development' });

    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.databaseUrl).toBe(INSECURE_DATABASE_URL);
    expect(config.adminUsername).toBe(INSECURE_ADMIN_USERNAME);
    expect(config.adminPassword).toBe(INSECURE_ADMIN_PASSWORD);
    expect(config.flagdHost).toBe('localhost');
    expect(config.flagdPort).toBe(8013);
    expect(config.envs).toEqual(['dev', 'staging', 'prod']);
    expect(config.webDist).toContain('web/dist');
  });

  it('applies development defaults when NODE_ENV is unset', () => {
    const config = loadConfig({});

    expect(config.nodeEnv).toBe('development');
    expect(config.port).toBe(3000);
  });

  it('parses explicit environment values', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'mysql://fms:secret@10.0.0.5:3306/fms',
      ADMIN_USERNAME: 'ops',
      ADMIN_PASSWORD: 's3cret',
      JWT_SECRET: 'jwt-secret',
      FLAGD_HOST: 'flagd.internal',
      FLAGD_PORT: '8013',
      ENVS: 'dev,staging,prod,qa',
      SYNC_KEY: 'fms_sync_key',
      WEB_DIST: '/var/lib/fms/web',
    });

    expect(config.port).toBe(8080);
    expect(config.databaseUrl).toBe('mysql://fms:secret@10.0.0.5:3306/fms');
    expect(config.adminUsername).toBe('ops');
    expect(config.adminPassword).toBe('s3cret');
    expect(config.flagdHost).toBe('flagd.internal');
    expect(config.flagdPort).toBe(8013);
    expect(config.envs).toEqual(['dev', 'staging', 'prod', 'qa']);
    expect(config.syncKey).toBe('fms_sync_key');
    expect(config.webDist).toBe('/var/lib/fms/web');
  });

  it('refuses insecure defaults when NODE_ENV=production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/insecure/i);
  });

  it('requires a JWT secret in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        ADMIN_USERNAME: 'ops',
        ADMIN_PASSWORD: 's3cret',
        DATABASE_URL: 'mysql://fms:secret@10.0.0.5:3306/fms',
      }),
    ).toThrow(/JWT_SECRET/i);
  });
});
