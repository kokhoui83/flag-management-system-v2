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

/**
 * NFR-1 latency measurement (roadmap M3; [05-testing.md §2.3]): records evaluation
 * durations and exposes the measured samples, applying the measurement protocol —
 * the first `LATENCY_WARMUP_CALLS` calls are discarded as provider warm-up, then every
 * subsequent duration is sampled so the p99 can be logged (a logged bound, not a hard gate).
 */
export const LATENCY_WARMUP_CALLS = 100;

export class LatencyTracker {
  private readonly samples: number[] = [];
  private callsSinceWarmupStart = 0;
  private warmedUp = false;

  /** Records one measured evaluation duration (ms). */
  record(durationMs: number): void {
    if (!this.warmedUp) {
      this.callsSinceWarmupStart += 1;
      if (this.callsSinceWarmupStart >= LATENCY_WARMUP_CALLS) {
        this.warmedUp = true;
      }
      return;
    }
    this.samples.push(durationMs);
  }

  /** Number of samples recorded after the warm-up window. */
  getSampleCount(): number {
    return this.samples.length;
  }

  /** All recorded samples (after the warm-up window). */
  getSamples(): number[] {
    return [...this.samples];
  }

  /** p99 of the recorded samples; null while no sample was recorded. */
  percentile99(): number | null {
    return percentile99(this.samples);
  }

  /** Mean of the recorded samples; null while no sample was recorded. */
  mean(): number | null {
    return mean(this.samples);
  }

  /** Clears recorded samples and restarts the warm-up window (e.g. before a measurement run). */
  reset(): void {
    this.samples.length = 0;
    this.callsSinceWarmupStart = 0;
    this.warmedUp = false;
  }
}
