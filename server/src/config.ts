import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const INSECURE_DATABASE_URL = 'mysql://fms:fms@127.0.0.1:3306/fms';
export const INSECURE_ADMIN_USERNAME = 'admin';
export const INSECURE_ADMIN_PASSWORD = 'dev-insecure-password';

export const DEFAULT_PORT = 3000;
export const DEFAULT_FLAGD_HOST = 'localhost';
export const DEFAULT_FLAGD_PORT = 8013;
export const DEFAULT_ENVS = ['dev', 'staging', 'prod'];
// Resolved from the repo root so the server can boot from any working directory.
export const DEFAULT_WEB_DIST = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../web/dist',
);

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production';
  databaseUrl: string;
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
  flagdHost: string;
  flagdPort: number;
  envs: string[];
  syncKey: string | null;
  webDist: string;
}

function readInt(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
): number {
  const raw = env[key];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`Config error: ${key} must be an integer (got ${raw})`);
  }
  if (value < 1 || value > 65535) {
    throw new Error(`Config error: ${key} must be between 1 and 65535 (got ${raw})`);
  }
  return value;
}

function readString(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: string,
): string {
  const value = env[key];
  return value === undefined || value === '' ? fallback : value;
}

function readStringList(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: string[],
): string[] {
  const raw = env[key];
  if (raw === undefined || raw === '') {
    return [...fallback];
  }
  const items = raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (items.length === 0) {
    return [...fallback];
  }
  return items;
}

function generateJwtSecret(): string {
  // dev-only random secret per boot; production requires an explicit one (see §6/§9).
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

function assertSecureDefaults(
  nodeEnv: 'development' | 'production',
  config: {
    databaseUrl: string;
    adminUsername: string;
    adminPassword: string;
    jwtSecret: string;
  },
): void {
  if (nodeEnv !== 'production') {
    return;
  }
  if (
    config.adminUsername === INSECURE_ADMIN_USERNAME ||
    config.adminPassword === INSECURE_ADMIN_PASSWORD
  ) {
    throw new Error(
      `Insecure admin defaults refused: set ADMIN_USERNAME/ADMIN_PASSWORD when NODE_ENV=production`,
    );
  }
  if (config.databaseUrl === INSECURE_DATABASE_URL) {
    throw new Error(
      `Insecure database default refused: set DATABASE_URL when NODE_ENV=production`,
    );
  }
  if (config.jwtSecret === '') {
    throw new Error(`JWT_SECRET must be set when NODE_ENV=production`);
  }
}

/**
 * Environment-driven configuration (architecture §9). Pure function over the
 * environment map so it is trivially unit-testable; production refuses insecure
 * defaults (admin credentials, database URL, JWT secret).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv =
    (env.NODE_ENV as 'development' | 'production' | undefined) ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'production') {
    throw new Error(
      `Config error: NODE_ENV must be 'development' or 'production' (got ${nodeEnv})`,
    );
  }

  const port = readInt(env, 'PORT', DEFAULT_PORT);
  const databaseUrl = env.DATABASE_URL ?? INSECURE_DATABASE_URL;
  const adminUsername = readString(
    env,
    'ADMIN_USERNAME',
    INSECURE_ADMIN_USERNAME,
  );
  const adminPassword = readString(
    env,
    'ADMIN_PASSWORD',
    INSECURE_ADMIN_PASSWORD,
  );
  const jwtSecret =
    env.JWT_SECRET ?? (nodeEnv === 'development' ? generateJwtSecret() : '');
  const flagdHost = readString(env, 'FLAGD_HOST', DEFAULT_FLAGD_HOST);
  const flagdPort = readInt(env, 'FLAGD_PORT', DEFAULT_FLAGD_PORT);
  const envs = readStringList(env, 'ENVS', DEFAULT_ENVS);
  const syncKey = env.SYNC_KEY ?? null;
  const webDist = readString(env, 'WEB_DIST', DEFAULT_WEB_DIST);

  assertSecureDefaults(nodeEnv, {
    databaseUrl,
    adminUsername,
    adminPassword,
    jwtSecret,
  });

  return {
    port,
    nodeEnv,
    databaseUrl,
    adminUsername,
    adminPassword,
    jwtSecret,
    flagdHost,
    flagdPort,
    envs,
    syncKey,
    webDist,
  };
}
