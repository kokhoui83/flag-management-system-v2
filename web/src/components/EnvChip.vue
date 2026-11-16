<template>
  <span class="env-chip" :class="`env-chip--${tone}`">
    <span class="env-chip-dot" aria-hidden="true" />{{ env }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/** Environment identity, consistent on every screen: dev blue, staging amber, prod red. */
const props = defineProps<{ env: string }>();

const tone = computed(() =>
  ['dev', 'staging', 'prod'].includes(props.env) ? props.env : 'custom',
);
</script>

<style scoped>
.env-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--bg-sunken);
  color: var(--ink-2);
}
.env-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.env-chip--dev {
  background: var(--env-dev-soft);
  color: var(--env-dev);
}
.env-chip--staging {
  background: var(--env-staging-soft);
  color: var(--env-staging);
}
.env-chip--prod {
  background: var(--env-prod-soft);
  color: var(--env-prod);
}
</style>
