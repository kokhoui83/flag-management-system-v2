import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { existsSync } from 'node:fs';
import { fastifyStatic } from '@fastify/static';
import type { AppConfig } from './config';

/**
 * Fastify app factory (architecture §2.1 module layout). M0 wires the health
 * surface only; provider-backed routes (sync/evaluate/events) land in later
 * milestones, and the flagd provider registry in M3.
 */
export async function createApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  app.get('/healthz', async () => {
    // Liveness: process alive.
    return { status: 'ok' };
  });

  app.get('/readyz', async (_request: FastifyRequest, reply: FastifyReply) => {
    // M0: provider wiring (flagd) does not exist yet — declared not-ready by default.
    // Returns 503 until the M3 provider registry reports READY (FR-24).
    return reply.code(503).send({ status: 'not_ready' });
  });

  if (existsSync(config.webDist)) {
    app.register(fastifyStatic, { root: config.webDist, prefix: '/' });
  }

  return app;
}
