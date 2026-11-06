import { describe, it, expect } from 'vitest';
import { InMemoryFlagChangeBroadcaster } from './broadcaster';

describe('change-event broadcaster (ADR-0008 / FR-51)', () => {
  it('starts with an empty queue per flag set', () => {
    const broadcaster = new InMemoryFlagChangeBroadcaster();
    expect(broadcaster.queued('checkout:staging')).toEqual([]);
  });

  it('queues a committed change per flag set and drains it on configuration change', () => {
    const broadcaster = new InMemoryFlagChangeBroadcaster();
    broadcaster.enqueue('checkout:staging', {
      flagKey: 'new-checkout',
      version: 2,
      at: '2026-11-05T00:00:00.000Z',
      auditId: 'new-checkout:staging',
    });

    expect(broadcaster.queued('checkout:staging')).toHaveLength(1);

    const drained = broadcaster.drain('checkout:staging');
    expect(drained).toHaveLength(1);
    expect(drained[0]!.flagKey).toBe('new-checkout');
    expect(drained[0]!.version).toBe(2);
    expect(broadcaster.queued('checkout:staging')).toEqual([]);
  });

  it('keeps queues of independent flag sets isolated', () => {
    const broadcaster = new InMemoryFlagChangeBroadcaster();
    broadcaster.enqueue('checkout:staging', { flagKey: 'new-checkout', version: 2, at: '2026-11-05T00:00:00.000Z' });
    broadcaster.enqueue('billing:prod', { flagKey: 'billing-flag', version: 5, at: '2026-11-05T00:00:01.000Z' });

    expect(broadcaster.queued('checkout:staging')).toHaveLength(1);
    expect(broadcaster.queued('billing:prod')).toHaveLength(1);
    expect(broadcaster.drain('checkout:staging')).toHaveLength(1);
    expect(broadcaster.queued('billing:prod')).toHaveLength(1);
  });
});
