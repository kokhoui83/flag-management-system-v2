<template>
  <span class="role-tag" :class="`role-tag--${normalized ?? 'none'}`">{{
    normalized ?? fallback
  }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { normalizeRole } from '@fms/shared';

/** Role identity: admin emerald, developer blue, product owner violet. */
const props = withDefaults(
  defineProps<{ role: string | null | undefined; fallback?: string }>(),
  { fallback: 'no role' },
);

const normalized = computed(() => normalizeRole(props.role));
</script>

<style scoped>
.role-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  background: var(--bg-sunken);
  color: var(--ink-3);
}
.role-tag--admin {
  background: var(--role-admin-soft);
  color: var(--role-admin);
}
.role-tag--developer {
  background: var(--role-developer-soft);
  color: var(--role-developer);
}
.role-tag--product-owner {
  background: var(--role-product-owner-soft);
  color: var(--role-product-owner);
}
</style>
