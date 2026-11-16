<template>
  <div class="diff-view">
    <p v-if="diffs.length === 0" class="caption">No differences.</p>
    <ul v-else class="diff-list">
      <li v-for="row in diffs" :key="row.key" class="diff-row">
        <code class="diff-key">{{ row.key }}</code>
        <code class="diff-line diff-line--before"
          ><span aria-hidden="true">− </span>before:
          {{ formatValue(row.before) }}</code
        >
        <code class="diff-line diff-line--after"
          ><span aria-hidden="true">+ </span>after:
          {{ formatValue(row.after) }}</code
        >
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface DiffRow {
  key: string;
  before: unknown;
  after: unknown;
}

function stable(value: unknown): string {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value) ?? String(value);
}

function computeDiffs(before: unknown, after: unknown): DiffRow[] {
  if (
    before === null ||
    after === null ||
    typeof before !== 'object' ||
    typeof after !== 'object'
  ) {
    if (stable(before) === stable(after)) return [];
    return [{ key: 'value', before, after }];
  }
  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  const rows: DiffRow[] = [];
  for (const key of [...keys].sort()) {
    const beforeValue = beforeObj[key];
    const afterValue = afterObj[key];
    if (stable(beforeValue) === stable(afterValue)) continue;
    const nested = computeDiffs(beforeValue, afterValue);
    if (nested.length > 0) {
      for (const row of nested) {
        rows.push({
          key: `${key}.${row.key}`,
          before: row.before,
          after: row.after,
        });
      }
    } else {
      rows.push({ key, before: beforeValue, after: afterValue });
    }
  }
  return rows;
}

const props = defineProps<{
  before: unknown;
  after: unknown;
}>();

const diffs = computed<DiffRow[]>(() =>
  computeDiffs(props.before, props.after),
);

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>

<style scoped>
.diff-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-sm);
}
.diff-row {
  display: grid;
  grid-template-columns: minmax(120px, 220px) 1fr 1fr;
  gap: var(--space-sm);
  align-items: start;
}
.diff-key {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.diff-line {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
}
.diff-line--before {
  background: var(--bad-100);
  color: var(--bad-700);
}
.diff-line--after {
  background: var(--ok-100);
  color: var(--ok-700);
}
@media (max-width: 640px) {
  .diff-row {
    grid-template-columns: 1fr;
  }
}
</style>
