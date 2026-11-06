import Fastify, { type FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { fastifyStatic } from '@fastify/static';
import { fastifyCookie } from '@fastify/cookie';
import { createAuthService } from './http/auth';
import { registerRoutes, type RouteServices } from './http/routes';
import { FmsError, problemBody, PROBLEM_TYPES } from './http/problem';
import { createStore, type Store } from './store';
import { createPrismaClient } from './db';
import { type AppConfig } from './config';
import { FlagdModelMemo } from './sync/model-memo';
import { OpenFeature } from '@openfeature/server-sdk';
import { OpenFeatureFlagEvaluator, type FlagEvaluator } from './evaluate/evaluator';
import { FlagdProviderRegistry } from './evaluate/providers';
import { InMemoryFlagChangeBroadcaster, type FlagChangeBroadcaster } from './events/broadcaster';

export interface AppOptions {
  /** Overrides the Prisma-backed store (tests inject one bound to a test DB). */
  store?: Store;
  /** Shared memo for the store and sync route (tests inject one with their store). */
  memo?: FlagdModelMemo;
  /** Overrides the OpenFeature-backed flag evaluator (tests inject a fake). */
  evaluator?: FlagEvaluator;
  /** Overrides the flagd provider registry (tests inject a fake). */
  registry?: FlagdProviderRegistry;
  /** Overrides the change-event broadcaster (tests inject a fake). */
  broadcaster?: FlagChangeBroadcaster;
}

const PUBLIC_PATHS = new Set(['/healthz', '/readyz', '/api/v1/auth/login', '/api/v1/auth/logout']);

/**
 * Fastify app factory (architecture §2.1 module layout). Wires auth (session/API
 * key), the M1 route surface (projects, flags, definitions, audit, keys, auth,
 * openapi) and the RFC 9457 problem+json error handler.
 */
export async function createApp(config: AppConfig, options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const memo = options.memo ?? new FlagdModelMemo();
  const store = options.store ?? createStore(createPrismaClient(config.databaseUrl), { memo });
  const registry = options.registry ?? new FlagdProviderRegistry({ openFeature: () => OpenFeature, flagd: { host: config.flagdHost, port: config.flagdPort } });
  const broadcaster = options.broadcaster ?? new InMemoryFlagChangeBroadcaster();
  const evaluator = options.evaluator ?? new OpenFeatureFlagEvaluator({ openFeature: () => OpenFeature, registry });
  const auth = createAuthService({
    store,
    adminUsername: config.adminUsername,
    adminPassword: config.adminPassword,
    jwtSecret: config.jwtSecret,
  });

  app.addHook('onRequest', async (request) => {
    const path = request.url.split('?')[0] ?? '';
    if (PUBLIC_PATHS.has(path) || path.startsWith('/api/v1/auth/')) {
      return;
    }
    await auth.resolve(request);
  });

  app.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof FmsError) {
      if (error.status === 401) {
        reply.header('WWW-Authenticate', 'Bearer');
      }
      return reply.code(error.status).type('application/problem+json').send(problemBody(error));
    }
    app.log.error({ err: error }, 'unhandled error');
    return reply
      .code(500)
      .type('application/problem+json')
      .send(problemBody(new FmsError(500, PROBLEM_TYPES.unavailable, 'Internal error')));
  });

  app.register(fastifyCookie);

  const services: RouteServices = { auth, store, memo, evaluator, registry, broadcaster };
  await registerRoutes(app, services);

  if (existsSync(config.webDist)) {
    app.register(fastifyStatic, { root: config.webDist, prefix: '/' });
  }

  return app;
}
