<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Audit log</h1>
        <p class="page-subtitle">
          Append-only history of management actions, newest first.
        </p>
      </div>
    </header>

    <form class="audit-filters" @submit.prevent="search">
      <n-form-item label="Actor">
        <n-input
          v-model:value="actorFilter"
          placeholder="admin"
          data-testid="audit-actor-filter"
        />
      </n-form-item>
      <n-form-item label="Action">
        <n-input
          v-model:value="actionFilter"
          placeholder="definition.update"
          data-testid="audit-action-filter"
        />
      </n-form-item>
      <n-form-item label="Entity">
        <n-input
          v-model:value="entityFilter"
          placeholder="flag"
          data-testid="audit-entity-filter"
        />
      </n-form-item>
      <n-button
        type="primary"
        attr-type="submit"
        :loading="loading"
        data-testid="audit-search"
        >Search</n-button
      >
    </form>

    <n-alert
      v-if="errorMessageText"
      type="error"
      :show-icon="true"
      :title="errorMessageText"
      role="alert"
      data-testid="audit-error"
    />

    <div v-if="loaded && entries.length === 0" class="card empty-state">
      <strong>No audit entries match these filters</strong>
      <span
        >Filters match the exact action and entity; actor matches a part.</span
      >
    </div>
    <div v-if="entries.length > 0" class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col">Entity</th>
            <th scope="col">Env</th>
            <th scope="col">Diff</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="entry in entries" :key="entry.id">
            <tr data-testid="audit-row">
              <td>
                <code>{{ formatTimestamp(entry.createdAt) }}</code>
              </td>
              <td>{{ entry.actorName }}</td>
              <td>
                <code class="action">{{ entry.action }}</code>
              </td>
              <td>
                {{ entry.entity }} <code>{{ entry.entityId }}</code>
              </td>
              <td>
                <env-chip v-if="entry.env" :env="entry.env" />
                <span v-else>—</span>
              </td>
              <td>
                <n-button
                  v-if="hasDiff(entry)"
                  size="small"
                  quaternary
                  :aria-expanded="expanded.has(entry.id)"
                  :aria-controls="`audit-diff-${entry.id}`"
                  data-testid="audit-diff-toggle"
                  @click="toggle(entry.id)"
                  >{{ expanded.has(entry.id) ? 'Hide' : 'Show' }} diff</n-button
                >
                <span v-else>—</span>
              </td>
            </tr>
            <tr
              v-if="expanded.has(entry.id)"
              :id="`audit-diff-${entry.id}`"
              class="diff-row"
              data-testid="audit-diff"
            >
              <td colspan="6">
                <diff-view :before="entry.before" :after="entry.after" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="entries.length > 0" class="pagination">
      <n-button
        :disabled="!nextBefore"
        :loading="loadingOlder"
        data-testid="audit-older"
        @click="loadOlder"
        >Load older</n-button
      >
      <span class="caption" data-testid="audit-count">
        {{ entries.length }}
        {{ entries.length === 1 ? 'entry' : 'entries' }} shown{{
          nextBefore ? '' : ' — end of the log'
        }}
      </span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { NAlert, NButton, NFormItem, NInput } from 'naive-ui';
import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import type { AuditEntry } from '../api/types';
import DiffView from '../components/DiffView.vue';
import EnvChip from '../components/EnvChip.vue';
import { formatTimestamp } from '../format';

const PAGE_SIZE = 50;

interface AuditFilters {
  actor: string | null;
  action: string | null;
  entity: string | null;
}

const entries = ref<AuditEntry[]>([]);
const actorFilter = ref('');
const actionFilter = ref('');
const entityFilter = ref('');
/** Filters of the listing on screen — older pages continue the same listing (FR-38/FR-46). */
const appliedFilters = ref<AuditFilters>({
  actor: null,
  action: null,
  entity: null,
});
const loading = ref(false);
const loadingOlder = ref(false);
const loaded = ref(false);
const nextBefore = ref<string | null>(null);
const errorMessageText = ref<string | null>(null);
const expanded = reactive(new Set<string>());

function carriesState(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value !== 'object' || Object.keys(value).length > 0;
}

/** Only entries that recorded a before or after state have something to expand. */
function hasDiff(entry: AuditEntry): boolean {
  return carriesState(entry.before) || carriesState(entry.after);
}

function toggle(id: string): void {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
}

async function search(): Promise<void> {
  appliedFilters.value = {
    actor: actorFilter.value.trim() || null,
    action: actionFilter.value.trim() || null,
    entity: entityFilter.value.trim() || null,
  };
  loading.value = true;
  try {
    const page = await api.listAudit({
      ...appliedFilters.value,
      limit: PAGE_SIZE,
    });
    entries.value = page.entries;
    nextBefore.value = page.nextBefore;
    expanded.clear();
    errorMessageText.value = null;
    loaded.value = true;
  } catch (error) {
    errorMessageText.value = errorMessage(
      error,
      'Failed to load the audit log',
    );
  } finally {
    loading.value = false;
  }
}

async function loadOlder(): Promise<void> {
  if (!nextBefore.value) return;
  loadingOlder.value = true;
  try {
    const page = await api.listAudit({
      ...appliedFilters.value,
      before: nextBefore.value,
      limit: PAGE_SIZE,
    });
    entries.value = [...entries.value, ...page.entries];
    nextBefore.value = page.nextBefore;
    errorMessageText.value = null;
  } catch (error) {
    errorMessageText.value = errorMessage(
      error,
      'Failed to load older entries',
    );
  } finally {
    loadingOlder.value = false;
  }
}

onMounted(search);
</script>

<style scoped>
.audit-filters {
  display: flex;
  align-items: flex-end;
  gap: var(--space-lg);
  flex-wrap: wrap;
}
.audit-filters .n-form-item {
  flex: 1 1 160px;
}
.diff-row td {
  background: var(--bg-canvas);
}
.action {
  background: var(--bg-sunken);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}
.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
</style>
