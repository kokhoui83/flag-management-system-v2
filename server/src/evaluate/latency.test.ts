import { describe, it, expect } from 'vitest';
import { mean, percentile99 } from './latency';

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
