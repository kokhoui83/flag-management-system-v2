<template>
  <n-tag
    :type="isHealthy ? 'success' : 'warning'"
    :bordered="false"
    :data-testid="`sync-badge-${flagKey}`"
  >
    {{ isHealthy ? 'sync: ok' : `sync: stale (${staleEnvs.join(', ')})` }}
  </n-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NTag } from 'naive-ui';
import type { ObservedEnvironmentStatus } from '../api/types';

interface Props {
  flagKey: string;
  /** Stored flag-level version (FR-5); the observed version comes from flagd via the probe (FR-47). */
  flagVersion: number;
  /** Per-environment flagd-observed status; empty/omitted environments are omitted (FR-7). */
  observed: Record<string, ObservedEnvironmentStatus> | null;
}

const props = defineProps<Props>();

const staleEnvs = computed<string[]>(() => {
  if (!props.observed) return [];
  return Object.entries(props.observed)
    .filter(([, status]) => status.version !== props.flagVersion)
    .map(([env]) => env);
});

const isHealthy = computed<boolean>(
  () => props.observed !== null && staleEnvs.value.length === 0,
);
</script>
