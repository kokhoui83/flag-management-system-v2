<template>
  <div class="diff-view">
    <n-text v-if="diffs.length === 0" depth="2">No differences.</n-text>
    <template v-else>
      <ul class="diff-list">
        <li v-for="row in diffs" :key="row.key" class="diff-row">
          <n-text strong>{{ row.key }}</n-text>
          <n-text depth="2">before: {{ formatValue(row.before) }}</n-text>
          <n-text depth="2">after: {{ formatValue(row.after) }}</n-text>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NText } from 'naive-ui';

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
.diff-view {
  font-size: 13px;
}
.diff-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.diff-row {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px dashed #e2e8f0;
}
</style>
