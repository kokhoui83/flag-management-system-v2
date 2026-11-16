<template>
  <span
    class="pill"
    :class="pillClass"
    :title="detail"
    :data-testid="`sync-badge-${flagKey}`"
    :data-sync-state="state"
  >
    <span class="pill-dot" aria-hidden="true" />{{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ObservedEnvironmentStatus } from '../api/types';

interface Props {
  flagKey: string;
  /** Stored flag-level version (FR-5); the observed version comes from flagd via the probe (FR-47). */
  flagVersion: number;
  /**
   * Per-environment flagd-observed status; environments without a definition are omitted
   * (FR-7). `null` = no observation yet.
   */
  observed: Record<string, ObservedEnvironmentStatus> | null;
  /** The last probe failed: flagd could not be asked what it serves. */
  unavailable?: boolean;
}

const props = defineProps<Props>();

function served(status: ObservedEnvironmentStatus): string {
  return status.version === null ? 'not served' : `v${status.version}`;
}

const staleEntries = computed<Array<[string, ObservedEnvironmentStatus]>>(
  () => {
    if (!props.observed) return [];
    return Object.entries(props.observed).filter(
      ([, status]) => status.version !== props.flagVersion,
    );
  },
);

type SyncState = 'unavailable' | 'unknown' | 'stale' | 'synced';

const state = computed<SyncState>(() => {
  if (props.unavailable) return 'unavailable';
  if (props.observed === null) return 'unknown';
  return staleEntries.value.length > 0 ? 'stale' : 'synced';
});

const pillClass = computed(
  () =>
    ({
      synced: 'pill--ok',
      stale: 'pill--warn',
      unavailable: 'pill--bad',
      unknown: 'pill--muted',
    })[state.value],
);

const label = computed<string>(() => {
  if (state.value === 'unavailable') return 'Sync unavailable';
  if (state.value === 'unknown') return 'Sync unknown';
  if (state.value === 'synced') return `Synced v${props.flagVersion}`;
  return `Stale · ${staleEntries.value
    .map(([env, status]) => `${env} ${served(status)}`)
    .join(', ')} ≠ v${props.flagVersion}`;
});

const detail = computed<string>(() => {
  if (state.value === 'unavailable')
    return 'flagd did not answer for this flag — it may be unreachable or not syncing this project';
  if (state.value === 'unknown')
    return 'flagd has not reported which version it serves';
  if (state.value === 'synced')
    return `flagd serves the stored version v${props.flagVersion}`;
  return staleEntries.value
    .map(([env, status]) =>
      status.version === null
        ? `${env}: flagd does not serve this flag yet, stored v${props.flagVersion}`
        : `${env}: flagd serves v${status.version}, stored v${props.flagVersion}`,
    )
    .join('; ');
});
</script>
