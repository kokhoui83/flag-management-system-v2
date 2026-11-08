<template>
  <main class="api-keys-page">
    <n-page-header
      title="API keys"
      subtitle="Machine credentials for flagd consumers (FR-32 / FR-33 / FR-53)."
    />

    <n-alert
      v-if="errorMessage"
      type="error"
      :show-icon="true"
      :title="errorMessage"
    />

    <n-card v-if="createdKey" title="API key created" type="success">
      <n-text strong
        >Copy the key now — it is shown only once: {{ createdKey.key }}</n-text
      >
    </n-card>

    <n-button type="primary" @click="creatingKey = true">Create key</n-button>

    <n-card v-if="creatingKey">
      <n-form class="create-form" @submit.prevent="create">
        <n-form-item label="Key name">
          <n-input v-model:value="newKeyName" placeholder="billing-service" />
        </n-form-item>
        <n-form-item label="Scope">
          <n-select v-model:value="newKeyScope" :options="scopeOptions" />
        </n-form-item>
        <n-button type="primary" :loading="creating" @click="create"
          >Create</n-button
        >
        <n-button :disabled="creating" @click="cancelCreate">Cancel</n-button>
      </n-form>
    </n-card>

    <n-card v-for="key in keys" :key="key.id" class="key-card">
      <n-page-header
        :title="key.name"
        :subtitle="`prefix: ${key.prefix} · scope: ${key.scope}`"
      >
        <n-button
          size="small"
          type="error"
          quaternary
          :disabled="key.revokedAt !== null"
          @click="revoke(key)"
          >Revoke</n-button
        >
      </n-page-header>
      <n-descriptions :columns="2">
        <n-descriptions-item label="createdAt">{{
          key.createdAt
        }}</n-descriptions-item>
        <n-descriptions-item label="lastUsedAt">{{
          key.lastUsedAt ?? 'never'
        }}</n-descriptions-item>
        <n-descriptions-item label="revokedAt">{{
          key.revokedAt ?? '—'
        }}</n-descriptions-item>
      </n-descriptions>
    </n-card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NForm,
  NFormItem,
  NInput,
  NPageHeader,
  NSelect,
} from 'naive-ui';
import { api } from '../api/client';
import type { ApiKeyCreated, ApiKeyRecord } from '../api/types';

const keys = ref<ApiKeyRecord[]>([]);
const createdKey = ref<ApiKeyCreated | null>(null);
const creatingKey = ref(false);
const newKeyName = ref('');
const newKeyScope = ref('evaluate');
const creating = ref(false);
const errorMessage = ref<string | null>(null);

const scopeOptions = ref<Array<{ label: string; value: string }>>([
  { label: 'evaluate', value: 'evaluate' },
  { label: 'sync', value: 'sync' },
  { label: 'manage', value: 'manage' },
  { label: 'all', value: 'all' },
]);

async function loadKeys(): Promise<void> {
  try {
    keys.value = (await api.listApiKeys()).keys;
    createdKey.value = null;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to load API keys';
  }
}

async function create(): Promise<void> {
  creating.value = true;
  try {
    const created = await api.createApiKey(newKeyName.value, newKeyScope.value);
    createdKey.value = created;
    creatingKey.value = false;
    newKeyName.value = '';
    await loadKeys();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create API key';
  } finally {
    creating.value = false;
  }
}

function cancelCreate(): void {
  creatingKey.value = false;
}

async function revoke(key: ApiKeyRecord): Promise<void> {
  try {
    await api.revokeApiKey(key.id);
    await loadKeys();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to revoke API key';
  }
}

void loadKeys();
</script>

<style scoped>
.api-keys-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.key-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.create-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
