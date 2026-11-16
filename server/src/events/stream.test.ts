import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { InMemoryFlagChangeBroadcaster } from './broadcaster';
import { SSE_KEEPALIVE_MS, startFlagChangeStream } from './stream';
import type {
  FlagdProviderEvent,
  FlagdProviderRegistry,
} from '../evaluate/providers';

/** Raw-socket double: records what the stream writes and lets a test close the connection. */
class FakeRaw extends EventEmitter {
  readonly written: string[] = [];
  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }
}

function fakeRegistry() {
  const listeners = new Set<(event: FlagdProviderEvent) => void>();
  const registry = {
    onEvent(listener: (event: FlagdProviderEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as FlagdProviderRegistry;
  return {
    registry,
    emit: (event: FlagdProviderEvent) =>
      listeners.forEach((listener) => listener(event)),
    listenerCount: () => listeners.size,
  };
}

function open(
  flagSetIds?: string[],
  shared = {
    broadcaster: new InMemoryFlagChangeBroadcaster(),
    ...fakeRegistry(),
  },
) {
  const raw = new FakeRaw();
  const { broadcaster, registry, emit, listenerCount } = shared;
  const stream = startFlagChangeStream({
    broadcaster,
    registry,
    reply: { raw } as never,
    flagSetIds,
  });
  return { raw, broadcaster, emit, listenerCount, stream, shared };
}

describe('startFlagChangeStream (ADR-0008 / FR-51)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes to the client immediately so the connection is established without waiting for an event', () => {
    const { raw } = open();

    expect(raw.written).toEqual([': connected\n\n']);
  });

  it('sends a keepalive comment on the keepalive interval', () => {
    vi.useFakeTimers();
    const { raw } = open();

    vi.advanceTimersByTime(SSE_KEEPALIVE_MS);

    expect(raw.written.at(-1)).toBe(': keepalive\n\n');
  });

  it('drains queued flag changes when flagd applies a new configuration', () => {
    const { raw, broadcaster, emit } = open();
    broadcaster.enqueue('checkout:dev', {
      flagKey: 'new-checkout',
      version: 4,
      at: '2026-11-07T00:00:00.000Z',
    });

    emit({
      type: 'provider-configuration-changed',
      flagSetId: 'checkout:dev',
    } as FlagdProviderEvent);

    expect(raw.written.at(-1)).toBe(
      'event: flag-changed\ndata: {"projectKey":"checkout","env":"dev","flagSetId":"checkout:dev","flagKey":"new-checkout","version":4,"at":"2026-11-07T00:00:00.000Z"}\n\n',
    );
  });

  it('ignores provider events of flag sets outside the selection', () => {
    const { raw, emit } = open(['checkout:prod']);

    emit({
      type: 'provider-ready',
      flagSetId: 'checkout:dev',
    } as FlagdProviderEvent);

    expect(raw.written).toHaveLength(1);
  });

  it('stops listening when the client disconnects', () => {
    const { raw, listenerCount } = open();
    expect(listenerCount()).toBe(1);

    raw.emit('close');

    expect(listenerCount()).toBe(0);
  });

  it('delivers each flag change to every connected client, not only the first (FR-52)', () => {
    const first = open();
    const second = open(undefined, first.shared);
    const other = open(['checkout:prod'], first.shared);
    first.broadcaster.enqueue('checkout:dev', {
      flagKey: 'new-checkout',
      version: 4,
      at: '2026-11-07T00:00:00.000Z',
    });

    first.emit({
      type: 'provider-configuration-changed',
      flagSetId: 'checkout:dev',
    } as FlagdProviderEvent);

    expect(first.raw.written.at(-1)).toContain('event: flag-changed');
    expect(second.raw.written.at(-1)).toContain('event: flag-changed');
    expect(other.raw.written).toHaveLength(1);
    expect(first.broadcaster.queued('checkout:dev')).toEqual([]);
  });

  it('keeps delivering to the remaining clients after one disconnects', () => {
    const first = open();
    const second = open(undefined, first.shared);

    first.raw.emit('close');
    first.emit({
      type: 'provider-ready',
      flagSetId: 'checkout:dev',
    } as FlagdProviderEvent);

    expect(first.raw.written).toHaveLength(1);
    expect(second.raw.written.at(-1)).toContain('event: provider-ready');
    second.raw.emit('close');
    expect(first.listenerCount()).toBe(0);
  });
});
