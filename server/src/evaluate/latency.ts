/**
 * Latency measurement helpers for the NFR-1 protocol (roadmap M2 follow-up / M3 acceptance;
 * [05-testing.md §2.3], [01-requirements.md NFR-1/NFR-2).
 *
 * The protocol: stack fully ready (flagd READY, models synced), discard a warmup window of
 * 100 calls, then measure sequential calls and log the p99 — p99 is a *logged* bound, not a
 * flaky hard gate (NFR-1).
 */

/** p99 (1-indexed percentile) of a sample set; returns null for an empty sample. */
export function percentile99(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (99 / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  const interpolated = sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
  return interpolated;
}

/** Mean of the samples; convenience for small warm-up windows. */
export function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}
