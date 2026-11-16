<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Evaluate playground</h1>
        <p class="page-subtitle">
          Resolve a flag through flagd exactly as an application would.
        </p>
      </div>
    </header>

    <div class="playground-layout">
      <section class="card" aria-labelledby="configure-heading">
        <h2 id="configure-heading" class="section-title">Configure</h2>
        <form class="form playground-form" @submit.prevent="runEvaluation">
          <n-form-item label="Project">
            <n-select
              v-model:value="projectKey"
              :options="projectOptions"
              placeholder="Select a project"
              data-testid="playground-project"
            />
          </n-form-item>
          <n-form-item label="Flag">
            <n-select
              v-model:value="flagKey"
              :options="flagOptions"
              :loading="loadingFlags"
              filterable
              :input-props="{ 'aria-label': 'Flag' }"
              placeholder="Select a flag"
              data-testid="playground-flag"
            />
          </n-form-item>
          <n-form-item label="Environment">
            <n-select
              v-model:value="env"
              :options="envOptions"
              placeholder="Select an environment"
              data-testid="playground-env"
            />
          </n-form-item>
          <p
            v-if="definitionMissing"
            class="banner banner--info"
            data-testid="playground-missing"
          >
            “{{ flagKey }}” has no definition in “{{ env }}” — there is nothing
            to evaluate.
          </p>
          <n-form-item
            label="Targeting key"
            :feedback="
              requiresTargetingKey
                ? 'Required: this flag has a percentage rule; evaluation is sticky by this key.'
                : 'Required for percentage-split rules; evaluation is sticky by this key.'
            "
          >
            <n-input
              v-model:value="targetingKey"
              placeholder="user-42"
              data-testid="playground-targeting-key"
            />
          </n-form-item>
          <n-form-item label="Context JSON">
            <n-input
              v-model:value="contextJson"
              class="mono"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 8 }"
              placeholder='{"country": "FR", "plan": "pro"}'
              data-testid="playground-context"
            />
          </n-form-item>
          <div class="form-actions">
            <n-button
              type="primary"
              attr-type="submit"
              :loading="loading"
              data-testid="playground-evaluate"
              >Evaluate</n-button
            >
          </div>
        </form>
      </section>

      <section
        class="card result-card"
        aria-labelledby="result-heading"
        aria-live="polite"
      >
        <h2 id="result-heading" class="section-title">Result</h2>
        <n-alert
          v-if="errorMessageText"
          type="error"
          :show-icon="true"
          :title="errorMessageText"
          role="alert"
          data-testid="playground-error"
        >
          <span v-if="evaluationFailed"
            >If flagd is not ready, check the sync badge of this flag in its
            project.</span
          >
        </n-alert>
        <div
          v-if="!result && !errorMessageText"
          class="empty-state"
          data-testid="playground-empty"
        >
          <strong>No evaluation yet</strong>
          <span>Pick a flag and an environment, then evaluate.</span>
        </div>
        <div v-if="result" class="stack" data-testid="playground-result">
          <code class="result-value" data-testid="result-value">{{
            String(result.value)
          }}</code>
          <dl class="result-list">
            <div>
              <dt>Variant</dt>
              <dd>
                <span class="pill pill--brand" data-testid="result-variant">{{
                  result.variant ?? '—'
                }}</span>
              </dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>
                <code data-testid="result-reason">{{ result.reason }}</code>
              </dd>
            </div>
            <div>
              <dt>Flag version</dt>
              <dd>
                <code
                  >v<span data-testid="result-version">{{
                    result.flagVersion
                  }}</span></code
                >
              </dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd><env-chip :env="evaluatedEnv" /></dd>
            </div>
          </dl>
          <div class="form-actions">
            <n-button size="small" :loading="loading" @click="runEvaluation"
              >Retry</n-button
            >
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NAlert, NButton, NFormItem, NInput, NSelect } from 'naive-ui';
import EnvChip from '../components/EnvChip.vue';
import { useSessionStore } from '../stores/session';
import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import type { EvaluationResult, FlagDetail, FlagSummary } from '../api/types';

/**
 * The playground owns its data: it loads the flags of the picked project and the definition
 * of the picked flag itself, so its options and the percentage-rule targeting-key guard never
 * depend on which views were visited before (FR-44/FR-19).
 */
const session = useSessionStore();

const initialProject =
  session.projects.find(
    (project) => project.id === session.selectedProjectId,
  ) ?? session.projects[0];

const projectKey = ref<string | null>(initialProject?.key ?? null);
const flagKey = ref<string | null>(null);
const env = ref<string | null>(null);
const targetingKey = ref('');
const contextJson = ref('{}');
const flags = ref<FlagSummary[]>([]);
const detail = ref<FlagDetail | null>(null);
const loadingFlags = ref(false);
const result = ref<EvaluationResult | null>(null);
const loading = ref(false);
const errorMessageText = ref<string | null>(null);
/** The API was asked and failed (as opposed to a form problem caught before sending). */
const evaluationFailed = ref(false);
const evaluatedEnv = ref('');

const project = computed(() =>
  session.projects.find((candidate) => candidate.key === projectKey.value),
);
const projectOptions = computed(() =>
  session.projects.map((candidate) => ({
    label: candidate.name,
    value: candidate.key,
  })),
);
const flagOptions = computed(() =>
  flags.value.map((flag) => ({ label: flag.key, value: flag.key })),
);
const envOptions = computed(() =>
  (project.value?.environments ?? []).map((name) => ({
    label: name,
    value: name,
  })),
);

const definition = computed(() =>
  env.value ? detail.value?.definitions[env.value] : undefined,
);
const definitionMissing = computed(
  () => detail.value !== null && env.value !== null && !definition.value,
);
const requiresTargetingKey = computed<boolean>(() => {
  const rules = definition.value?.rules as Array<{ type?: string }> | undefined;
  return rules?.some((rule) => rule?.type === 'percentage') ?? false;
});

watch(
  project,
  async (selected) => {
    flagKey.value = null;
    detail.value = null;
    result.value = null;
    flags.value = [];
    env.value = selected?.environments[0] ?? null;
    if (!selected) return;
    loadingFlags.value = true;
    try {
      const loaded = (await api.listFlags(selected.id)).flags;
      // A slower response for a project the user has already left must not win.
      if (project.value?.id === selected.id) flags.value = loaded;
      errorMessageText.value = null;
    } catch (error) {
      errorMessageText.value = errorMessage(error, 'Failed to load flags');
    } finally {
      loadingFlags.value = false;
    }
  },
  { immediate: true },
);

watch(flagKey, async (key) => {
  detail.value = null;
  result.value = null;
  const selected = project.value;
  if (!key || !selected) return;
  try {
    const loaded = await api.getFlag(selected.id, key);
    if (flagKey.value === key) detail.value = loaded;
    errorMessageText.value = null;
  } catch (error) {
    errorMessageText.value = errorMessage(error, 'Failed to load the flag');
  }
});

function parseContext(): Record<string, unknown> | undefined | null {
  if (contextJson.value.trim().length === 0) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(contextJson.value);
  } catch {
    errorMessageText.value = 'Context JSON is not valid';
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    errorMessageText.value = 'Context JSON must be an object';
    return null;
  }
  return parsed as Record<string, unknown>;
}

async function runEvaluation(): Promise<void> {
  result.value = null;
  evaluationFailed.value = false;
  if (!projectKey.value || !flagKey.value || !env.value) {
    errorMessageText.value = 'Pick a project, flag and environment to evaluate';
    return;
  }
  if (requiresTargetingKey.value && !targetingKey.value) {
    errorMessageText.value =
      'A targeting key is required for flags with a percentage rule.';
    return;
  }
  const context = parseContext();
  if (context === null) return;
  loading.value = true;
  try {
    result.value = await api.evaluate({
      projectKey: projectKey.value,
      flagKey: flagKey.value,
      environment: env.value,
      targetingKey: targetingKey.value || undefined,
      context,
    });
    evaluatedEnv.value = env.value;
    errorMessageText.value = null;
  } catch (error) {
    evaluationFailed.value = true;
    errorMessageText.value = errorMessage(error, 'Evaluation failed');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.playground-layout {
  display: grid;
  grid-template-columns: minmax(0, 11fr) minmax(0, 9fr);
  gap: var(--space-xl);
  align-items: start;
}
.result-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--brand-700);
  overflow-wrap: anywhere;
}
.result-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-md);
  margin: 0;
}
.result-list dt {
  font-size: 12px;
  color: var(--ink-3);
}
.result-list dd {
  margin: 0;
}
@media (max-width: 960px) {
  .playground-layout {
    grid-template-columns: 1fr;
  }
}
</style>
