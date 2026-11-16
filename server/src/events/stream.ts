import type { FastifyReply } from 'fastify';
import type { FlagChangeBroadcaster } from './broadcaster';
import type {
  FlagdProviderEvent,
  FlagdProviderRegistry,
} from '../evaluate/providers';

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

interface StreamFrame {
  flagSetId: string;
  event: string;
  payload: Record<string, unknown>;
}

type FrameListener = (frame: StreamFrame) => void;

/**
 * Turns provider events into SSE frames exactly once and fans them out to every open stream.
 * The per-flag-set change queue is drained here, not per stream — otherwise the first
 * connected client would consume the changes and all others would miss them (FR-52).
 */
class FlagChangeDispatcher {
  private readonly listeners = new Set<FrameListener>();
  private unsubscribeFromRegistry: (() => void) | null = null;

  constructor(
    private readonly registry: FlagdProviderRegistry,
    private readonly broadcaster: FlagChangeBroadcaster,
  ) {}

  subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    this.unsubscribeFromRegistry ??= this.registry.onEvent((event) =>
      this.dispatch(event),
    );
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.unsubscribeFromRegistry?.();
        this.unsubscribeFromRegistry = null;
      }
    };
  }

  private dispatch(event: FlagdProviderEvent): void {
    const { projectKey, env } = flagSetParts(event.flagSetId);
    const base = { projectKey, env, flagSetId: event.flagSetId };
    if (event.type !== 'provider-configuration-changed') {
      this.publish({
        flagSetId: event.flagSetId,
        event: event.type,
        payload: { ...base, at: new Date().toISOString() },
      });
      return;
    }
    // ADR-0008: drain the per-flag-set queue only when flagd applied a new model.
    for (const change of this.broadcaster.drain(event.flagSetId)) {
      this.publish({
        flagSetId: event.flagSetId,
        event: 'flag-changed',
        payload: {
          ...base,
          flagKey: change.flagKey,
          version: change.version,
          at: change.at,
        },
      });
    }
  }

  private publish(frame: StreamFrame): void {
    for (const listener of [...this.listeners]) listener(frame);
  }
}

/** One dispatcher per provider registry (i.e. per running app). */
const dispatchers = new WeakMap<FlagdProviderRegistry, FlagChangeDispatcher>();

function dispatcherFor(
  registry: FlagdProviderRegistry,
  broadcaster: FlagChangeBroadcaster,
): FlagChangeDispatcher {
  let dispatcher = dispatchers.get(registry);
  if (!dispatcher) {
    dispatcher = new FlagChangeDispatcher(registry, broadcaster);
    dispatchers.set(registry, dispatcher);
  }
  return dispatcher;
}

/**
 * Opens the SSE stream for one (or all) flag sets: keepalive every 15 s, no replay, and
 * `flag-changed` events drained from the per-flag-set queue on provider configuration
 * changes (ADR-0008; FR-51).
 */
export function startFlagChangeStream(
  input: StartFlagChangeStreamInput,
): FlagChangeStreamHandle {
  const { broadcaster, registry, reply, flagSetIds } = input;
  const raw = reply.raw;
  let closed = false;

  // An SSE comment right away flushes the response headers, so the client's connection opens
  // immediately instead of with the first event or keepalive.
  raw.write(': connected\n\n');

  const unsubscribe = dispatcherFor(registry, broadcaster).subscribe(
    (frame) => {
      const selected =
        !flagSetIds ||
        flagSetIds.length === 0 ||
        flagSetIds.includes(frame.flagSetId);
      if (selected) raw.write(sseFrame(frame.event, frame.payload));
    },
  );
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
