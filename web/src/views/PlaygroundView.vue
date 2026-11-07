<template>
  <main class="playground-page">
    <n-page-header
      title="Evaluate playground"
      subtitle="Call the management API evaluate proxy (FR-22) and inspect the OpenFeature resolution."
    />

    <n-form class="playground-form" @submit.prevent="runEvaluation">
      <n-form-item label="Project">
        <n-select v-model:value="projectKey" :options="projectOptions" />
      </n-form-item>
      <n-form-item label="Flag">
        <n-select v-model:value="flagKey" :options="flagOptions" />
      </n-form-item>
      <n-form-item label="Environment">
        <n-select v-model:value="env" :options="envOptions" />
      </n-form-item>
      <n-form-item
        label="Targeting key"
        :hint="
          requiresTargetingKey
            ? 'Required for flags with a percentage rule (FR-19/FR-44).'
            : undefined
        "
      >
        <n-input v-model:value="targetingKey" placeholder="user-42" />
      </n-form-item>
      <n-form-item label="Context JSON">
        <n-input
          type="textarea"
          v-model:value="contextJson"
          placeholder='{"email": "user42@acme.com"}'
        />
      </n-form-item>
      <n-button type="primary" :loading="loading" @click="runEvaluation"
        >Evaluate</n-button
      >
      <n-alert
        v-if="errorMessage"
        type="error"
        :show-icon="true"
        :message="errorMessage"
      />
    </n-form>

    <n-card v-if="result">
      <n-descriptions title="Evaluation result" :columns="2">
        <n-descriptions-item label="value">{{
          result.value
        }}</n-descriptions-item>
        <n-descriptions-item label="variant">{{
          result.variant
        }}</n-descriptions-item>
        <n-descriptions-item label="reason">{{
          result.reason
        }}</n-descriptions-item>
        <n-descriptions-item label="flagVersion">{{
          result.flagVersion
        }}</n-descriptions-item>
      </n-descriptions>
    </n-card>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
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
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import { api } from '../api/client';
import type { EvaluationResult } from '../api/types';

const router = useRouter();
const flagsStore = useFlagsStore();
const session = useSessionStore();

const projectKey = ref(session.projects[0]?.key ?? '');
const flagKey = ref('');
const env = ref('staging');
const targetingKey = ref('');
const contextJson = ref('{}');
const result = ref<EvaluationResult | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const projectOptions = computed(() =>
  session.projects.map((project) => ({
    label: project.name,
    value: project.key,
  })),
);
const flagOptions = computed(() =>
  flagsStore.flags.map((flag) => ({ label: flag.key, value: flag.key })),
);
const envOptions = computed<Array<{ label: string; value: string }>>(() => {
  const environments =
    session.projects.find((p) => p.key === projectKey.value)?.environments ??
    [];
  return environments.map((env) => ({ label: env, value: env }));
});

const requiresTargetingKey = computed<boolean>(() => {
  const definition = flagsStore.detail?.definitions[env.value];
  const rules = definition?.rules as Array<{ type?: string }> | undefined;
  return rules?.some((rule) => rule?.type === 'percentage') ?? false;
});

async function runEvaluation(): Promise<void> {
  if (!flagKey.value) {
    errorMessage.value = 'Pick a flag to evaluate';
    return;
  }
  if (requiresTargetingKey.value && !targetingKey.value) {
    errorMessage.value =
      'A targeting key is required for flags with a percentage rule (FR-19/FR-44).';
    return;
  }
  let context: Record<string, unknown> | undefined;
  if (contextJson.value.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(contextJson.value);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        errorMessage.value = 'Context JSON must be an object';
        return;
      }
      context = parsed as Record<string, unknown>;
    } catch {
      errorMessage.value = 'Context JSON is not valid';
      return;
    }
  }
  loading.value = true;
  try {
    const evaluation = await api.evaluate({
      projectKey: projectKey.value,
      flagKey: flagKey.value,
      environment: env.value,
      targetingKey: targetingKey.value || undefined,
      context,
    });
    result.value = evaluation;
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Evaluation failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.playground-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.playground-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 640px;
}
</style>
