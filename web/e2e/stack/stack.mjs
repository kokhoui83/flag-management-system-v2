#!/usr/bin/env node
// Isolated browser-E2E stack (docs/05-testing.md §1, browser E2E tier):
//   MariaDB (container, 127.0.0.1:3307) → API serving the built dashboard (host process) →
//   flagd (container, :8013) syncing the `checkout` project with a freshly issued sync key.
// It never touches the development database or the compose stack.
//
//   node web/e2e/stack/stack.mjs up     build the dashboard and start everything
//   node web/e2e/stack/stack.mjs down   stop and remove everything
//   node web/e2e/stack/stack.mjs run    up → Playwright suite → down (exit code of the suite)
//
// `run` starts from an empty database, so every full run sees the same initial state.
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const runDir = path.join(here, '.run');
const pidFile = path.join(runDir, 'api.pid');
const flagdConfig = path.join(runDir, 'flagd.yaml');

const MARIADB = 'fms-e2e-mariadb';
const FLAGD = 'fms-e2e-flagd';
const DB_PORT = process.env.E2E_DB_PORT ?? '3307';
const API_PORT = process.env.E2E_API_PORT ?? '3000';
// Docker Desktop relays host.docker.internal to loopback; a plain Linux engine needs 0.0.0.0.
const API_HOST = process.env.E2E_API_HOST ?? 'localhost';
const API = `http://localhost:${API_PORT}`;
const SYNC_PROJECT = 'checkout';
const SYNC_ENVS = ['dev', 'staging', 'prod'];
const ADMIN = { username: 'admin', password: 'dev-insecure-password' };

function docker(args, options = {}) {
  return execFileSync('docker', args, { encoding: 'utf8', ...options });
}

function removeContainer(name) {
  try {
    docker(['rm', '-f', name], { stdio: 'ignore' });
  } catch {
    // Not running: nothing to remove.
  }
}

async function waitFor(description, probe, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await probe().catch(() => false)) return;
    if (Date.now() > deadline)
      throw new Error(`Timed out waiting for ${description}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function api(method, route, token, body) {
  const response = await fetch(`${API}/api/v1${route}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

function signalApi(pid, signal) {
  try {
    // The API runs in its own process group (npm → tsx → node): signal the whole group.
    process.kill(-pid, signal);
    return true;
  } catch {
    return false; // The group is gone.
  }
}

async function stopApi() {
  if (!existsSync(pidFile)) return;
  const pid = Number(readFileSync(pidFile, 'utf8'));
  rmSync(pidFile);
  signalApi(pid, 'SIGTERM');
  // Graceful shutdown waits for open connections (SSE streams); do not wait on it forever.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && signalApi(pid, 0)) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  signalApi(pid, 'SIGKILL');
}

async function assertPortFree() {
  const taken = await fetch(`${API}/healthz`).then(
    () => true,
    () => false,
  );
  if (taken) {
    throw new Error(
      `Port ${API_PORT} is already serving an API — stop it before starting the E2E stack`,
    );
  }
}

async function up() {
  await down();
  await assertPortFree();
  mkdirSync(runDir, { recursive: true });

  console.log('• MariaDB');
  docker([
    'run',
    '-d',
    '--name',
    MARIADB,
    '-e',
    'MARIADB_ROOT_PASSWORD=root',
    '-e',
    'MARIADB_DATABASE=fms',
    '-e',
    'MARIADB_USER=fms',
    '-e',
    'MARIADB_PASSWORD=fms',
    '-p',
    `127.0.0.1:${DB_PORT}:3306`,
    'mariadb:11.8',
  ]);
  await waitFor('MariaDB', async () => {
    docker(['exec', MARIADB, 'healthcheck.sh', '--connect'], {
      stdio: 'ignore',
    });
    return true;
  });

  console.log('• dashboard build');
  execFileSync('npm', ['run', 'build:web'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  console.log('• API');
  const log = openSync(path.join(runDir, 'api.log'), 'w');
  const server = spawn('npm', ['run', 'start', '-w', 'server'], {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', log, log],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: `mysql://fms:fms@127.0.0.1:${DB_PORT}/fms`,
      PORT: API_PORT,
      HOST: API_HOST,
      FLAGD_PORT: '8013',
    },
  });
  server.unref();
  writeFileSync(pidFile, String(server.pid));
  await waitFor('the API', async () => (await fetch(`${API}/healthz`)).ok);

  console.log('• flagd');
  const login = await api('POST', '/auth/login', null, ADMIN);
  const token = login.body.token;
  const project = await api('POST', '/projects', token, {
    key: SYNC_PROJECT,
    name: 'Checkout',
  });
  if (project.status !== 201)
    throw new Error(`Cannot create '${SYNC_PROJECT}': ${project.status}`);
  const key = await api('POST', '/api-keys', token, {
    name: 'e2e-flagd-sync',
    scope: 'sync',
  });
  if (key.status !== 201)
    throw new Error(`Cannot create the sync key: ${key.status}`);
  writeFileSync(
    flagdConfig,
    [
      'sources:',
      ...SYNC_ENVS.flatMap((env) => [
        `  - uri: http://host.docker.internal:${API_PORT}/api/v1/sync/${SYNC_PROJECT}/${env}`,
        '    provider: http',
        '    interval: 1',
        `    authHeader: "Bearer ${key.body.key}"`,
      ]),
      '',
    ].join('\n'),
  );
  docker([
    'run',
    '-d',
    '--name',
    FLAGD,
    // flagd exits if its very first sync cannot reach the API (the host relay can lag a
    // moment behind the API coming up); let Docker start it again instead of failing the run.
    '--restart',
    'on-failure:5',
    '--add-host',
    'host.docker.internal:host-gateway',
    '-p',
    '8013:8013',
    '-v',
    `${flagdConfig}:/flagd/config.yaml:ro`,
    'ghcr.io/open-feature/flagd:v0.18.2',
    'start',
    '--config',
    '/flagd/config.yaml',
  ]);
  await waitFor('flagd to sync', async () => (await fetch(`${API}/readyz`)).ok);

  console.log(
    `\nE2E stack is up: ${API} (API log: ${path.join(runDir, 'api.log')})`,
  );
}

async function down() {
  await stopApi();
  removeContainer(FLAGD);
  removeContainer(MARIADB);
}

async function run() {
  await up();
  let status = 1;
  try {
    execFileSync('npm', ['run', 'test:e2e', '-w', 'web'], {
      cwd: repoRoot,
      stdio: 'inherit',
    });
    status = 0;
  } catch (error) {
    status = typeof error.status === 'number' ? error.status : 1;
  } finally {
    await down();
  }
  process.exit(status);
}

const command = process.argv[2];
if (command === 'up') await up();
else if (command === 'down') await down();
else if (command === 'run') await run();
else {
  console.error('usage: stack.mjs up|down|run');
  process.exit(2);
}
