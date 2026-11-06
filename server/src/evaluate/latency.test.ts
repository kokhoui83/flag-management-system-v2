import { describe, it, expect } from 'vitest';
import {
  mean,
  percentile99,
  LatencyTracker,
  LATENCY_WARMUP_CALLS,
} from './latency';

describe('NFR-1 latency measurement helpers', () => {
  it('computes the p99 of a sample', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile99(values)).toBeCloseTo(99.01, 2);
  });

  it('returns null for an empty sample', () => {
    expect(percentile99([])).toBeNull();
  });

  it('computes the mean of a sample', () => {
    expect(mean([2, 4])).toBe(3);
    expect(mean([])).toBeNull();
  });
});

describe('LatencyTracker (NFR-1 measurement protocol)', () => {
  it('discards the warm-up window before sampling begins', () => {
    const tracker = new LatencyTracker();
    for (let i = 0; i < LATENCY_WARMUP_CALLS; i += 1) {
      tracker.record(5);
    }
    expect(tracker.getSampleCount()).toBe(0);
  });

  it('starts sampling after the warm-up window is discarded', () => {
    const tracker = new LatencyTracker();
    for (let i = 0; i < LATENCY_WARMUP_CALLS; i += 1) {
      tracker.record(5);
    }
    tracker.record(7);
    expect(tracker.getSampleCount()).toBe(1);
    expect(tracker.percentile99()).toBe(7);
  });

  it('computes the p99 of the recorded samples', () => {
    const tracker = new LatencyTracker();
    for (let i = 0; i < LATENCY_WARMUP_CALLS; i += 1) {
      tracker.record(5);
    }
    tracker.record(10);
    tracker.record(20);
    // p99 of two samples interpolates between the two values (0-indexed rank = 0.99).
    expect(tracker.percentile99()).toBeCloseTo(19.9, 2);
  });

  it('returns null percentiles while no samples were recorded', () => {
    const tracker = new LatencyTracker();
    expect(tracker.percentile99()).toBeNull();
    expect(tracker.mean()).toBeNull();
  });
});
