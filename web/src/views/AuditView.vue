<template>
  <main class="audit-page">
    <n-page-header
      title="Audit log"
      subtitle="Admin-only immutable history of management actions (FR-31 / FR-57)."
    />

    <n-form class="audit-filters" @submit.prevent>
      <n-form-item label="Action">
        <n-input
          v-model:value="actionFilter"
          placeholder="flag.toggle"
          data-testid="audit-action-filter"
        />
      </n-form-item>
      <n-form-item label="Entity">
        <n-input
          v-model:value="entityFilter"
          placeholder="flag:my-flag"
          data-testid="audit-entity-filter"
        />
      </n-form-item>
      <n-button type="primary" size="small" :loading="loading" @click="load"
        >Search</n-button
      >
      <n-button size="small" @click="loadOlder" :disabled="!nextBefore"
        >Load older</n-button
      >
    </n-form>

    <n-card>
      <n-table>
        <thead>
          <tr>
            <th>createdAt</th>
            <th>actor</th>
            <th>action</th>
            <th>entity</th>
            <th>env</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td>{{ entry.createdAt }}</td>
            <td>{{ entry.actorName }}</td>
            <td>{{ entry.action }}</td>
            <td>{{ entry.entity }}</td>
            <td>{{ entry.env }}</td>
          </tr>
        </tbody>
      </n-table>
    </n-card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NPageHeader,
  NTable,
} from 'naive-ui';
import { api } from '../api/client';
import type { AuditEntry, AuditPage } from '../api/types';

const entries = ref<AuditEntry[]>([]);
const actionFilter = ref('');
const entityFilter = ref('');
const loading = ref(false);
const nextBefore = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const page = await api.listAudit({
      action: actionFilter.value.trim() || null,
      entity: entityFilter.value.trim() || null,
      limit: 50,
    });
    entries.value = page.entries;
    nextBefore.value = page.nextBefore;
  } catch (error) {
    entries.value = [];
    nextBefore.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadOlder(): Promise<void> {
  if (!nextBefore.value) return;
  loading.value = true;
  try {
    const page = await api.listAudit({ before: nextBefore.value, limit: 50 });
    entries.value = [...entries.value, ...page.entries];
    nextBefore.value = page.nextBefore;
  } finally {
    loading.value = false;
  }
}

void load();
</script>

<style scoped>
.audit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.audit-filters {
  display: flex;
  align-items: flex-end;
  gap: 16px;
}
</style>
