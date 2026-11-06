import type { FastifyReply } from 'fastify';
import type { FlagChangeBroadcaster } from './broadcaster';
import type { FlagdProviderEvent, FlagdProviderRegistry } from '../evaluate/providers';

/** SSE keepalive comment interval (ADR-0008: every 15 s). */
export const SSE_KEEPALIVE_MS = 15_000;

export interface FlagChangeStreamHandle {
  close(): void;
}

export interface StartFlagChangeStreamInput {
  broadcaster: FlagChangeBroadcaster;
  registry: FlagdProviderRegistry;
  reply: Pick<FastifyReply, 'raw'>;
  /** Restrict the stream to the `?envs=` selected flag sets; omit for all. */
  flagSetIds?: string[];
}

function flagSetParts(flagSetId: string): { projectKey: string; env: string } {
  const separator = flagSetId.lastIndexOf(':');
  const projectKey = separator > 0 ? flagSetId.slice(0, separator) : flagSetId;
  const env = separator > 0 ? flagSetId.slice(separator + 1) : '';
  return { projectKey, env };
}

function sseFrame(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

/**
 * Opens the SSE stream for one (or all) flag sets: keepalive every 15 s, no replay, and
 * `flag-changed` events drained from the per-flag-set queue on provider configuration
 * changes (ADR-0008; FR-51).
 */
export function startFlagChangeStream(input: StartFlagChangeStreamInput): FlagChangeStreamHandle {
  const { broadcaster, registry, reply, flagSetIds } = input;
  const raw = reply.raw;
  let closed = false;

  const send = (event: string, payload: Record<string, unknown>): void => {
    raw.write(sseFrame(event, payload));
  };

  const onProviderEvent = (event: FlagdProviderEvent): void => {
    if (flagSetIds && flagSetIds.length > 0 && !flagSetIds.includes(event.flagSetId)) {
      return;
    }
    if (event.type === 'provider-configuration-changed') {
      // ADR-0008: drain the per-flag-set queue only when flagd applied a new model.
      for (const change of broadcaster.drain(event.flagSetId)) {
        const { projectKey, env } = flagSetParts(event.flagSetId);
        send('flag-changed', {
          projectKey,
          env,
          flagSetId: event.flagSetId,
          flagKey: change.flagKey,
          version: change.version,
          at: change.at,
        });
      }
      return;
    }
    const { projectKey, env } = flagSetParts(event.flagSetId);
    send(event.type, { projectKey, env, flagSetId: event.flagSetId, at: new Date().toISOString() });
  };

  const unsubscribe = registry.onEvent(onProviderEvent);
  const keepalive = setInterval(() => {
    raw.write(': keepalive\n\n');
  }, SSE_KEEPALIVE_MS);
  const close = (): void => {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(keepalive);
    unsubscribe();
  };
  raw.once('close', close);

  return { close };
}
