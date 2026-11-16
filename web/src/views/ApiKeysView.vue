<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">API keys</h1>
        <p class="page-subtitle">
          Keys authenticate manage, sync and evaluate operations for management,
          flagd and SDK clients.
        </p>
      </div>
      <n-button type="primary" data-testid="api-key-new" @click="openCreate"
        >Create key</n-button
      >
    </header>

    <n-alert
      v-if="errorMessageText && !dialogOpen"
      type="error"
      :show-icon="true"
      :title="errorMessageText"
      role="alert"
    />

    <div v-if="loaded && keys.length === 0" class="card empty-state">
      <strong>No API keys yet</strong>
      <span>Create a key for flagd (sync) or an SDK client (evaluate).</span>
    </div>
    <div v-if="keys.length > 0" class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Scope</th>
            <th scope="col">Created</th>
            <th scope="col">Last used</th>
            <th scope="col">Status</th>
            <th scope="col"><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in keys" :key="key.id" :data-key-name="key.name">
            <th scope="row">
              {{ key.name }}
              <code class="key-prefix">{{ key.prefix }}…</code>
            </th>
            <td>
              <code>{{ key.scope.toLowerCase() }}</code>
            </td>
            <td :title="formatTimestamp(key.createdAt)">
              {{ formatRelative(key.createdAt) }}
            </td>
            <td :title="key.lastUsedAt ? formatTimestamp(key.lastUsedAt) : ''">
              {{ key.lastUsedAt ? formatRelative(key.lastUsedAt) : 'never' }}
            </td>
            <td data-testid="api-key-status">
              <span
                v-if="key.revokedAt"
                class="pill pill--muted"
                :title="formatTimestamp(key.revokedAt)"
                >Revoked</span
              >
              <span v-else class="pill pill--ok">Active</span>
            </td>
            <td>
              <n-popconfirm
                v-if="!key.revokedAt"
                positive-text="Revoke key"
                negative-text="Cancel"
                @positive-click="revoke(key)"
              >
                <template #trigger>
                  <n-button
                    size="small"
                    type="error"
                    quaternary
                    :aria-label="`Revoke ${key.name}`"
                    >Revoke</n-button
                  >
                </template>
                Revoke “{{ key.name }}”? Clients using it are rejected
                immediately.
              </n-popconfirm>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <app-dialog
      :show="dialogOpen"
      :title="createdKey ? 'API key created' : 'Create API key'"
      @update:show="closeDialog"
    >
      <section
        v-if="createdKey"
        class="secret-panel"
        role="status"
        data-testid="api-key-created"
      >
        <p>
          Key <strong>{{ createdKey.name }}</strong> ({{ createdKey.scope }}):
        </p>
        <code class="secret-value" data-testid="api-key-plaintext">{{
          createdKey.key
        }}</code>
        <p class="banner">
          This is the only time the key is shown — only its hash is stored. Copy
          it now.
        </p>
        <div class="form-actions">
          <n-button type="primary" @click="closeDialog(false)"
            >I have copied the key</n-button
          >
        </div>
      </section>
      <form v-else class="form create-form" @submit.prevent="create">
        <n-form-item label="Key name">
          <n-input
            v-model:value="newKeyName"
            placeholder="billing-service"
            data-testid="api-key-name"
          />
        </n-form-item>
        <n-form-item label="Scope" :feedback="scopeHint">
          <n-select
            v-model:value="newKeyScope"
            :options="scopeOptions"
            data-testid="api-key-scope"
          />
        </n-form-item>
        <n-alert
          v-if="errorMessageText"
          type="error"
          :show-icon="true"
          :title="errorMessageText"
          role="alert"
        />
        <div class="form-actions">
          <n-button
            type="primary"
            attr-type="submit"
            :loading="creating"
            data-testid="api-key-create"
            >Create</n-button
          >
          <n-button :disabled="creating" @click="closeDialog(false)"
            >Cancel</n-button
          >
        </div>
      </form>
    </app-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  NAlert,
  NButton,
  NFormItem,
  NInput,
  NPopconfirm,
  NSelect,
} from 'naive-ui';
import { API_KEY_SCOPES } from '@fms/shared';
import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import type { ApiKeyCreated, ApiKeyRecord } from '../api/types';
import { formatRelative, formatTimestamp } from '../format';
import AppDialog from '../components/AppDialog.vue';

const keys = ref<ApiKeyRecord[]>([]);
const loaded = ref(false);
/** One-time plaintext (FR-45): stays on screen until the admin dismisses it. */
const createdKey = ref<ApiKeyCreated | null>(null);
const creatingKey = ref(false);
const newKeyName = ref('');
const newKeyScope = ref<string>('evaluate');
const creating = ref(false);
const errorMessageText = ref<string | null>(null);

const scopeOptions = API_KEY_SCOPES.map((scope) => ({
  label: scope,
  value: scope,
}));

const SCOPE_HINTS: Record<string, string> = {
  manage: 'Management API: flags, definitions, projects, keys and audit.',
  sync: 'flagd reads flag sets from the sync endpoint.',
  evaluate: 'SDK clients evaluate flags and subscribe to change events.',
  all: 'Every operation — use only where a narrower scope cannot work.',
};
const scopeHint = computed(() => SCOPE_HINTS[newKeyScope.value] ?? '');

/** The dialog shows the form, then — after a create — the one-time plaintext (FR-45). */
const dialogOpen = computed(
  () => creatingKey.value || createdKey.value !== null,
);

function openCreate(): void {
  errorMessageText.value = null;
  newKeyName.value = '';
  creatingKey.value = true;
}

function closeDialog(show: boolean): void {
  if (show) return;
  creatingKey.value = false;
  createdKey.value = null;
  errorMessageText.value = null;
}

async function loadKeys(): Promise<void> {
  try {
    keys.value = (await api.listApiKeys()).keys;
    loaded.value = true;
  } catch (error) {
    errorMessageText.value = errorMessage(error, 'Failed to load API keys');
  }
}

async function create(): Promise<void> {
  if (newKeyName.value.trim().length === 0) {
    errorMessageText.value = 'A key name is required';
    return;
  }
  creating.value = true;
  try {
    createdKey.value = await api.createApiKey(
      newKeyName.value.trim(),
      newKeyScope.value,
    );
    creatingKey.value = false;
    newKeyName.value = '';
    errorMessageText.value = null;
    await loadKeys();
  } catch (error) {
    errorMessageText.value = errorMessage(error, 'Failed to create API key');
  } finally {
    creating.value = false;
  }
}

async function revoke(key: ApiKeyRecord): Promise<void> {
  try {
    await api.revokeApiKey(key.id);
    errorMessageText.value = null;
    await loadKeys();
  } catch (error) {
    errorMessageText.value = errorMessage(error, 'Failed to revoke API key');
  }
}

onMounted(loadKeys);
</script>

<style scoped>
.key-prefix {
  margin-left: var(--space-sm);
  color: var(--ink-3);
  font-weight: 400;
}
</style>
