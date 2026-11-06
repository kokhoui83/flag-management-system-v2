import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MariaDbContainer,
  type StartedMariaDbContainer,
} from '@testcontainers/mariadb';
import {
  GenericContainer,
  type StartedTestContainer,
  type WaitStrategy,
} from 'testcontainers';
import { createPrismaClient } from '../src/db';
import { createStore, type Store } from '../src/store';
import { createApp } from '../src/app';
import { loadConfig, type AppConfig } from '../src/config';
import { FlagdModelMemo } from '../src/sync/model-memo';
import { InMemoryFlagChangeBroadcaster } from '../src/events/broadcaster';
import { FlagdProviderRegistry } from '../src/evaluate/providers';
import { OpenFeatureFlagEvaluator } from '../src/evaluate/evaluator';
import { LatencyTracker } from '../src/evaluate/latency';
import { OpenFeature } from '@openfeature/server-sdk';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const FMS_PORT = 3999;
const FLAGD_GRPC_CONTAINER_PORT = 8013;

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

interface ReadyBody {
  status: string;
  db: string;
  flagd: Record<string, string>;
}

interface EvaluateBody {
  value?: boolean | number | string;
  variant?: string | null;
  reason?: string;
  flagVersion?: number;
}

/**
 * Testcontainers wait strategy: the suite owns readiness signalling via `/readyz`
 * polling, so the container just has to reach the running state.
 */
class RunningWaitStrategy implements WaitStrategy {
  async waitUntilReady(): Promise<void> {
    // Readiness is owned by the suite's /readyz polling loop.
  }

  withStartupTimeout(): WaitStrategy {
    return this;
  }

  isStartupTimeoutSet(): boolean {
    return true;
  }

  getStartupTimeout(): number {
    return 120_000;
  }
}

async function readSseEvents(
  response: Response,
  expectedEvent?: string,
  timeoutMs = 15_000,
): Promise<SseEvent[]> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('SSE response body is not readable');
  }
  const decoder = new TextDecoder();
  const events: SseEvent[] = [];
  let buffer = '';
  const deadline = Date.now() + timeoutMs;
  try {
    for (;;) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const lines = frame.split('\n');
        const eventLine = lines.find((line) => line.startsWith('event:')) ?? '';
        const dataLine = lines.find((line) => line.startsWith('data:')) ?? '';
        const event = eventLine.startsWith('event:')
          ? eventLine.slice(7).trim()
          : '';
        const data = dataLine.startsWith('data:')
          ? dataLine.slice(6).trim()
          : '';
        if (event && data) {
          events.push({
            event,
            data: JSON.parse(data) as Record<string, unknown>,
          });
        } else if (frame.trimStart().startsWith(':')) {
          // SSE comment / keepalive frame.
          events.push({ event: 'keepalive', data: {} });
        }
      }
      if (
        expectedEvent &&
        events.some((entry) => entry.event === expectedEvent)
      ) {
        break;
      }
    }
  } catch {
    // Client aborted or timed out — return whatever was collected.
  }
  if (expectedEvent) {
    return events.filter((entry) => entry.event === expectedEvent);
  }
  return events;
}

describe('M3 — flagd E2E (real flagd engine via testcontainers)', () => {
  let container: StartedMariaDbContainer;
  let flagd: StartedTestContainer;
  let prisma: ReturnType<typeof createPrismaClient>;
  let store: Store;
  let app: Awaited<ReturnType<typeof createApp>>;
  let config: AppConfig;
  let memo: FlagdModelMemo;
  const broadcaster = new InMemoryFlagChangeBroadcaster();
  let registry: FlagdProviderRegistry;
  const latency = new LatencyTracker();
  let evaluator: OpenFeatureFlagEvaluator;
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    container = new MariaDbContainer('mariadb:11.8')
      .withDatabase('fms_test')
      .withUsername('fms')
      .withUserPassword('fms')
      .withRootPassword('root');
    const started = await container.start();
    container = started;
    process.env.DATABASE_URL = `mysql://${started.getUsername()}:${started.getUserPassword()}@${started.getHost()}:${started.getPort()}/${started.getDatabase()}`;
    execSync('npx prisma migrate deploy', {
      cwd: repoRoot,
      stdio: 'inherit',
      env: process.env,
    });
    prisma = createPrismaClient(process.env.DATABASE_URL!);
    memo = new FlagdModelMemo();
    store = createStore(prisma, { memo });
    const { plaintext: syncKey } = await store.createApiKey({
      name: 'e2e-flagd-sync',
      scope: 'sync',
      createdBy: 'e2e',
    });

    const flagdConfigDir = mkdtempSync(path.join(os.tmpdir(), 'fms-flagd-'));
    const flagdConfigPath = path.join(flagdConfigDir, 'config.yaml');
    writeFileSync(
      flagdConfigPath,
      [
        'sources:',
        '  - uri: http://host.docker.internal:3999/api/v1/sync/checkout/dev',
        '    provider: http',
        '    interval: 2',
        `    authHeader: "Bearer ${syncKey}"`,
        '  - uri: http://host.docker.internal:3999/api/v1/sync/checkout/staging',
        '    provider: http',
        '    interval: 2',
        `    authHeader: "Bearer ${syncKey}"`,
        '  - uri: http://host.docker.internal:3999/api/v1/sync/checkout/prod',
        '    provider: http',
        '    interval: 2',
        `    authHeader: "Bearer ${syncKey}"`,
        '',
      ].join('\n'),
    );
    flagd = new GenericContainer('ghcr.io/open-feature/flagd:v0.18.2')
      .withCommand(['start', '--config', '/flagd/config.yaml'])
      .withExposedPorts({ container: FLAGD_GRPC_CONTAINER_PORT, host: 18013 })
      .withBindMounts([
        { source: flagdConfigPath, target: '/flagd/config.yaml', mode: 'ro' },
      ])
      .withStartupTimeout(120_000)
      .withAutoRemove(false);
    registry = new FlagdProviderRegistry({
      openFeature: () => OpenFeature,
      flagd: { host: 'localhost', port: 18013 },
    });
    evaluator = new OpenFeatureFlagEvaluator({
      openFeature: () => OpenFeature,
      registry,
      latency,
    });
    config = loadConfig({
      NODE_ENV: 'development',
      DATABASE_URL: process.env.DATABASE_URL!,
      PORT: String(FMS_PORT),
      FLAGD_PORT: '18013',
    });
    app = await createApp(config, {
      store,
      memo,
      evaluator,
      registry,
      broadcaster,
    });
    await app.listen({ port: Number(FMS_PORT) });

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { username: 'admin', password: 'dev-insecure-password' },
    });
    expect(login.statusCode).toBe(200);
    token = login.json().token;
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      headers: { authorization: `Bearer ${token}` },
      payload: { key: 'checkout', name: 'Checkout' },
    });
    expect(created.statusCode).toBe(201);
    projectId = created.json().id;
    const flag = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/flags`,
      headers: { authorization: `Bearer ${token}` },
      payload: { key: 'new-checkout', description: 'E2E checkout flag' },
    });
    expect(flag.statusCode).toBe(201);
    // The flagd sync sources target `<projectKey>:<env>` flag sets; they must exist before flagd starts
    // so the engine's initial sync succeeds and the provider can report READY.
    const put = await app.inject({
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
    expect(put.statusCode).toBe(200);

    const flagdContainer = new GenericContainer(
      'ghcr.io/open-feature/flagd:v0.18.2',
    )
      .withCommand(['start', '--config', '/flagd/config.yaml'])
      .withExposedPorts({ container: FLAGD_GRPC_CONTAINER_PORT, host: 18013 })
      .withBindMounts([
        { source: flagdConfigPath, target: '/flagd/config.yaml', mode: 'ro' },
      ])
      .withStartupTimeout(120_000)
      .withWaitStrategy(new RunningWaitStrategy())
      .withAutoRemove(false);
    flagd = await flagdContainer.start();
    const flagdPort = flagd.getMappedPort(FLAGD_GRPC_CONTAINER_PORT);
    expect(flagdPort).toBe(18013);
  }, 900_000);

  afterAll(async () => {
    await app.close();
    await flagd.stop();
    await prisma.$disconnect();
    await container.stop();
  });

  async function readyz(): Promise<{
    statusCode: number;
    body: ReadyBody | null;
  }> {
    const response = await fetch(`http://127.0.0.1:${FMS_PORT}/readyz`);
    const body = (await response.json().catch(() => null)) as ReadyBody | null;
    return { statusCode: response.status, body };
  }

  async function waitUntilReady(timeoutMs = 90_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let last: { statusCode: number; body: ReadyBody | null } | null = null;
    while (Date.now() < deadline) {
      last = await readyz();
      if (
        last.statusCode === 200 &&
        last.body?.status === 'ok' &&
        last.body?.db === 'OK'
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(
      `readyz did not become ready in time: ${JSON.stringify(last)}`,
    );
  }

  async function evaluate(input: {
    projectKey: string;
    flagKey: string;
    environment: string;
    targetingKey?: string;
    context?: Record<string, unknown>;
  }): Promise<{ status: number; body: EvaluateBody | null }> {
    const response = await fetch(
      `http://127.0.0.1:${FMS_PORT}/api/v1/evaluate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      },
    );
    const body = (await response
      .json()
      .catch(() => null)) as EvaluateBody | null;
    return { status: response.status, body };
  }

  async function putDefinition(enabled: boolean, rules: unknown[]) {
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${projectId}/flags/new-checkout/definitions/staging`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        enabled,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules,
      },
    });
    return response;
  }

  async function waitForEvaluate(
    predicate: (body: EvaluateBody | null) => boolean,
    timeoutMs = 20_000,
  ): Promise<EvaluateBody | null> {
    const deadline = Date.now() + timeoutMs;
    let last: EvaluateBody | null = null;
    while (Date.now() < deadline) {
      const result = await evaluate({
        projectKey: 'checkout',
        flagKey: 'new-checkout',
        environment: 'staging',
      });
      last = result.body;
      if (result.status === 200 && predicate(result.body)) {
        return result.body;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`waitForEvaluate timed out: ${JSON.stringify(last)}`);
  }

  it('GET /readyz → 200 READY once flagd is up and synced (M3 full-stack readiness)', async () => {
    await waitUntilReady();
    const { statusCode, body } = await readyz();
    expect(statusCode).toBe(200);
    expect(body?.status).toBe('ok');
    expect(body?.db).toBe('OK');
    expect(body?.flagd['checkout:staging']).toBe('READY');
  }, 30_000);

  it('POST /api/v1/evaluate resolves a static boolean flag through the real flagd provider (FR-21/FR-25)', async () => {
    await waitUntilReady();
    const put = await putDefinition(true, []);
    expect(put.statusCode).toBe(200);
    const result = await evaluate({
      projectKey: 'checkout',
      flagKey: 'new-checkout',
      environment: 'staging',
      context: { email: 'user42@acme.com' },
    });
    expect(result.status).toBe(200);
    expect(result.body?.value).toBe(false);
    expect(result.body?.variant).toBe('off');
    expect(['STATIC', 'DEFAULT']).toContain(result.body?.reason);
    expect(result.body?.flagVersion).toBe(2);
  }, 30_000);

  it('POST /api/v1/evaluate applies attribute targeting through flagd (FR-19)', async () => {
    const put = await putDefinition(true, [
      {
        type: 'attribute',
        conditions: [
          { attribute: 'email', op: 'ends_with', value: '@acme.com' },
        ],
        variant: 'on',
      },
    ]);
    expect(put.statusCode).toBe(200);
    const version = put.json().version as number;
    // Wait for flagd to sync and apply the new model before asserting targeting.
    await waitForEvaluate(
      (body: EvaluateBody | null) => body?.flagVersion === version,
    );

    const matched = await evaluate({
      projectKey: 'checkout',
      flagKey: 'new-checkout',
      environment: 'staging',
      context: { email: 'user42@acme.com' },
    });
    expect(matched.status).toBe(200);
    expect(matched.body?.variant).toBe('on');
    expect(matched.body?.value).toBe(true);

    const unmatched = await evaluate({
      projectKey: 'checkout',
      flagKey: 'new-checkout',
      environment: 'staging',
      context: { email: 'user42@other.io' },
    });
    expect(unmatched.status).toBe(200);
    expect(unmatched.body?.variant).toBe('off');
    expect(unmatched.body?.value).toBe(false);
  }, 30_000);

  it('percentage rollouts are sticky per targeting key and split near 50/50 (FR-19/FR-29)', async () => {
    const put = await putDefinition(true, [
      {
        type: 'percentage',
        splits: [
          { variant: 'on', weight: 50 },
          { variant: 'off', weight: 50 },
        ],
      },
    ]);
    expect(put.statusCode).toBe(200);
    const version = put.json().version as number;
    await waitForEvaluate(
      (body: EvaluateBody | null) => body?.flagVersion === version,
    );

    const keys = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
    const firstRound = new Map<string, boolean>();
    for (const key of keys) {
      const result = await evaluate({
        projectKey: 'checkout',
        flagKey: 'new-checkout',
        environment: 'staging',
        targetingKey: key,
        context: { targetingKey: key },
      });
      expect(result.status).toBe(200);
      firstRound.set(key, result.body?.value === true);
    }
    for (const key of keys.slice(0, 25)) {
      const repeat = await evaluate({
        projectKey: 'checkout',
        flagKey: 'new-checkout',
        environment: 'staging',
        targetingKey: key,
        context: { targetingKey: key },
      });
      expect(repeat.status).toBe(200);
      expect(repeat.body?.value).toBe(firstRound.get(key));
    }
    const onCount = [...firstRound.values()].filter(Boolean).length;
    expect(onCount).toBeGreaterThanOrEqual(450);
    expect(onCount).toBeLessThanOrEqual(550);
  }, 60_000);

  it('measures the NFR-1 evaluate latency (warm-up discarded, p99 logged and < 25 ms)', async () => {
    await waitUntilReady();
    latency.reset();

    const evaluateOnce = async (input: {
      projectKey: string;
      flagKey: string;
      environment: string;
    }) => {
      const response = await fetch(
        `http://127.0.0.1:${FMS_PORT}/api/v1/evaluate`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(input),
        },
      );
      return response.status;
    };

    for (let i = 0; i < 100; i += 1) {
      const warmupStatus = await evaluateOnce({
        projectKey: 'checkout',
        flagKey: 'new-checkout',
        environment: 'staging',
      });
      expect(warmupStatus).toBe(200);
    }
    for (let i = 0; i < 1000; i += 1) {
      const status = await evaluateOnce({
        projectKey: 'checkout',
        flagKey: 'new-checkout',
        environment: 'staging',
      });
      expect(status).toBe(200);
    }
    const p99 = latency.percentile99();
    app.log.info(
      { latencyMs: p99, samples: latency.getSampleCount() },
      'M3 E2E: NFR-1 evaluate latency measured',
    );
    expect(p99).not.toBeNull();
    expect(p99!).toBeLessThan(25);
  }, 60_000);

  it('serves the SSE flag-changed stream from real flagd provider configuration changes (FR-50/FR-51)', async () => {
    const response = await fetch(
      `http://127.0.0.1:${FMS_PORT}/api/v1/events?envs=checkout:staging`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30_000),
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const change = await putDefinition(true, []);
    expect(change.statusCode).toBe(200);

    const events = await readSseEvents(response, 'flag-changed', 30_000);
    expect(events.length).toBeGreaterThan(0);
    const payload = events[0]!.data;
    expect(payload.flagSetId).toBe('checkout:staging');
    expect(payload.projectKey).toBe('checkout');
    expect(payload.env).toBe('staging');
    expect(payload.flagKey).toBe('new-checkout');
    expect(typeof payload.version).toBe('number');
  }, 40_000);

  it('goes flagd ERROR → evaluate 503/problem+json + management ops OK → back to READY on restart', async () => {
    const response = await fetch(
      `http://127.0.0.1:${FMS_PORT}/api/v1/events?envs=checkout:staging`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(60_000),
      },
    );
    expect(response.status).toBe(200);

    // Give the 15s keepalive a chance to fire so frame delivery through the SSE client is proven.
    await new Promise((resolve) => setTimeout(resolve, 17_000));
    await flagd.stop();
    const allEvents = await readSseEvents(response, undefined, 30_000);
    const errorEvents = allEvents.filter(
      (entry) => entry.event === 'provider-error',
    );
    const keepaliveEvents = allEvents.filter(
      (entry) => entry.event === 'keepalive',
    );
    expect(keepaliveEvents.length).toBeGreaterThan(0);
    expect(errorEvents.length).toBeGreaterThan(0);

    const notReady = await readyz();
    expect(notReady.statusCode).toBe(503);
    expect(notReady.body?.status).toBe('not_ready');
    expect(notReady.body?.flagd['checkout:staging']).toBe('ERROR');

    const degraded = await evaluate({
      projectKey: 'checkout',
      flagKey: 'new-checkout',
      environment: 'staging',
    });
    expect(degraded.status).toBe(503);
    expect(degraded.body?.type).toBe('https://fms.local/errors/unavailable');

    const management = await putDefinition(true, []);
    expect(management.statusCode).toBe(200);

    await flagd.restart();

    const readyResponse = await fetch(
      `http://127.0.0.1:${FMS_PORT}/api/v1/events?envs=checkout:staging`,
      {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(60_000),
      },
    );
    expect(readyResponse.status).toBe(200);
    const readyEvents = await readSseEvents(
      readyResponse,
      'provider-ready',
      60_000,
    );
    expect(readyEvents.length).toBeGreaterThan(0);

    const recovered = await readyz();
    expect(recovered.statusCode).toBe(200);
    expect(recovered.body?.status).toBe('ok');
    const healthy = await evaluate({
      projectKey: 'checkout',
      flagKey: 'new-checkout',
      environment: 'staging',
    });
    expect(healthy.status).toBe(200);
  }, 120_000);
});
