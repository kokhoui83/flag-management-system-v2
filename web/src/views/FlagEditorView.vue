<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">
          <span class="visually-hidden">Edit flag: </span
          ><code class="title-key">{{ routeFlagKey }}</code>
        </h1>
        <p class="page-subtitle">
          Edit the flag definition for each environment.
        </p>
      </div>
      <div v-if="flagsStore.detail" class="page-actions">
        <sync-health-badge
          :flag-key="routeFlagKey"
          :flag-version="flagsStore.detail.version"
          :observed="flagsStore.observed[routeFlagKey] ?? null"
          :unavailable="flagsStore.observedFailed[routeFlagKey] === true"
        />
        <n-button size="small" @click="back">Back to flags</n-button>
      </div>
    </header>

    <n-alert
      v-if="loadError"
      type="error"
      :show-icon="true"
      :title="loadError"
      role="alert"
    >
      <n-button size="small" @click="back">Back to flags</n-button>
    </n-alert>
    <n-spin v-else-if="!flagsStore.detail" :show="true" class="editor-loading">
      <div class="card empty-state">Loading flag…</div>
    </n-spin>

    <div v-else class="editor-layout">
      <aside class="card flag-card" aria-labelledby="flag-details-heading">
        <h2 id="flag-details-heading" class="section-title">Flag details</h2>
        <dl class="meta-list">
          <div>
            <dt>Key</dt>
            <dd>
              <code>{{ routeFlagKey }}</code>
            </dd>
          </div>
          <div>
            <dt>Stored version</dt>
            <dd>
              <code data-testid="flag-version"
                >v{{ flagsStore.detail.version }}</code
              >
            </dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>{{ projectName }}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{{ formatTimestamp(flagsStore.detail.createdAt) }}</dd>
          </div>
        </dl>
        <n-form-item label="Description" :show-feedback="false">
          <n-input
            v-model:value="description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 5 }"
            :disabled="!capabilities.canCreateFlags"
            placeholder="What this flag controls"
            data-testid="flag-description"
          />
        </n-form-item>
        <n-button
          v-if="capabilities.canCreateFlags"
          size="small"
          :disabled="!descriptionChanged"
          :loading="savingDescription"
          data-testid="flag-description-save"
          @click="saveDescription"
          >Save description</n-button
        >
        <template v-if="capabilities.canDeleteFlags">
          <hr class="divider" />
          <div class="stack">
            <span class="overline">Danger zone</span>
            <n-popconfirm
              positive-text="Delete flag"
              negative-text="Cancel"
              @positive-click="deleteFlag"
            >
              <template #trigger>
                <n-button
                  size="small"
                  type="error"
                  secondary
                  data-testid="flag-delete"
                  >Delete flag</n-button
                >
              </template>
              Delete “{{ routeFlagKey }}” in every environment? This cannot be
              undone.
            </n-popconfirm>
          </div>
        </template>
      </aside>

      <form class="editor-form" @submit.prevent="save">
        <div class="card definition-card">
          <n-tabs v-model:value="env" type="line">
            <n-tab-pane
              v-for="envName in environments"
              :key="envName"
              :name="envName"
              :tab="tabLabel(envName)"
            >
              <div class="definition-header">
                <h2 class="section-title">Definition · {{ envName }}</h2>
                <label class="enabled-toggle">
                  <span>{{
                    localDefinition.enabled ? 'Enabled' : 'Disabled'
                  }}</span>
                  <n-switch
                    :value="localDefinition.enabled"
                    :disabled="!canToggle"
                    :aria-label="`Enabled in ${envName}`"
                    data-testid="definition-enabled"
                    @update:value="(checked: boolean) => setEnabled(checked)"
                  />
                </label>
              </div>
              <p
                v-if="!hasDefinition"
                class="banner banner--info"
                data-testid="definition-missing"
              >
                {{ missingDefinitionNote }}
              </p>
            </n-tab-pane>
          </n-tabs>

          <p
            v-if="readOnlyDefinition"
            class="banner banner--info"
            data-testid="read-only-note"
          >
            Product owner access: you can change the enabled state only.
          </p>

          <section class="stack" aria-labelledby="variants-heading">
            <h3 id="variants-heading" class="field-heading">Variants</h3>
            <variant-table
              :variants="localDefinition.variants"
              :disabled="!canEditDefinition"
              @update:variants="setVariants"
            />
          </section>

          <n-form-item
            label="Default variant"
            feedback="Served when no rule matches."
          >
            <n-select
              v-model:value="localDefinition.defaultVariant"
              class="default-variant"
              :options="variantItems"
              :disabled="!canEditDefinition"
              data-testid="default-variant"
            />
          </n-form-item>

          <section class="stack" aria-labelledby="rules-heading">
            <h3 id="rules-heading" class="field-heading">Rules</h3>
            <rule-editor
              :rules="localDefinition.rules"
              :variants="localDefinition.variants"
              :disabled="!canEditDefinition"
              @update:rules="
                (rules: FlagRule[]) => (localDefinition.rules = rules)
              "
            />
          </section>
        </div>

        <div class="save-bar">
          <div
            v-if="serverChanged"
            class="banner"
            role="status"
            data-testid="server-changed"
          >
            This flag changed on the server while you were editing. Saving
            replaces the stored definition with yours.
          </div>
          <div
            v-if="problems.length > 0"
            class="validation-panel"
            role="alert"
            data-testid="validation-problems"
          >
            <p>
              {{ problems.length }}
              {{ problems.length === 1 ? 'problem' : 'problems' }} to fix before
              saving:
            </p>
            <ol>
              <li v-for="problem in problems" :key="problem">{{ problem }}</li>
            </ol>
          </div>
          <n-alert
            v-if="errorMessageText"
            type="error"
            :show-icon="true"
            :title="errorMessageText"
            role="alert"
            data-testid="editor-error"
          />
          <p
            v-if="savedNotice"
            class="saved-notice"
            role="status"
            data-testid="editor-saved"
          >
            {{ savedNotice }}
          </p>
          <div class="save-actions">
            <div v-if="capabilities.canEditDefinitions" class="copy-row">
              <n-select
                v-model:value="copyFromEnv"
                class="copy-source"
                :options="copySourceEnvs"
                placeholder="Copy from…"
                :input-props="{
                  'aria-label': 'Copy definition from environment',
                }"
                data-testid="copy-source"
              />
              <n-popconfirm
                positive-text="Replace definition"
                negative-text="Cancel"
                @positive-click="copyFrom"
              >
                <template #trigger>
                  <n-button
                    :disabled="!copyFromEnv"
                    :loading="copying"
                    data-testid="copy-submit"
                    >Copy</n-button
                  >
                </template>
                Replace the whole “{{ env }}” definition with the one from “{{
                  copyFromEnv
                }}”?
              </n-popconfirm>
            </div>
            <span class="save-spacer" />
            <n-button
              quaternary
              :disabled="!isDirty || saving"
              data-testid="definition-discard"
              @click="loadDraft"
              >Discard</n-button
            >
            <n-button
              type="primary"
              attr-type="submit"
              :loading="saving"
              :disabled="!canSave"
              data-testid="definition-save"
              >Save changes</n-button
            >
          </div>
        </div>
      </form>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NFormItem,
  NInput,
  NPopconfirm,
  NSelect,
  NSpin,
  NSwitch,
  NTabs,
  NTabPane,
} from 'naive-ui';
import {
  validateDefinition,
  type FlagDefinitionInput,
  type FlagRule,
  type VariantValue,
} from '@fms/shared';
import { DefinitionValidationError, useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import { apiValidationProblems, errorMessage } from '../api/errors';
import type { FlagDefinition } from '../api/types';
import { formatTimestamp } from '../format';
import RuleEditor from '../components/RuleEditor.vue';
import SyncHealthBadge from '../components/SyncHealthBadge.vue';
import VariantTable from '../components/VariantTable.vue';

const route = useRoute();
const router = useRouter();
const flagsStore = useFlagsStore();
const session = useSessionStore();

const routeFlagKey = computed(() => String(route.params.flagKey ?? ''));
const projectId = computed(() =>
  String(route.params.projectId ?? session.selectedProjectId ?? ''),
);
const project = computed(() =>
  session.projects.find((candidate) => candidate.id === projectId.value),
);
const projectName = computed(() => project.value?.name ?? '');
const environments = computed<string[]>(
  () => project.value?.environments ?? [],
);
const capabilities = computed(() => session.capabilitiesFor(projectId.value));

const description = ref('');
const env = ref<string>('');
const saving = ref(false);
const savingDescription = ref(false);
const copying = ref(false);
const loadError = ref<string | null>(null);
const errorMessageText = ref<string | null>(null);
const savedNotice = ref<string | null>(null);
const problems = ref<string[]>([]);
const serverChanged = ref(false);
const copyFromEnv = ref<string | null>(null);

function pristineDefinition(): FlagDefinitionInput {
  return {
    enabled: true,
    variants: { on: true, off: false },
    defaultVariant: 'off',
    rules: [],
  };
}

/** Editable copy of a stored definition — never a reference into the store's state. */
function draftOf(stored: FlagDefinition | undefined): FlagDefinitionInput {
  if (!stored) return pristineDefinition();
  return JSON.parse(
    JSON.stringify({
      enabled: stored.enabled,
      variants: stored.variants,
      defaultVariant: stored.defaultVariant,
      rules: stored.rules,
    }),
  ) as FlagDefinitionInput;
}

const localDefinition = ref<FlagDefinitionInput>(pristineDefinition());
/** Serialized draft as last loaded/saved; a differing draft has unsaved edits. */
const baseline = ref(JSON.stringify(localDefinition.value));

const storedDefinition = computed(
  () => flagsStore.detail?.definitions[env.value],
);
const hasDefinition = computed(() => storedDefinition.value !== undefined);
const isDirty = computed(
  () => JSON.stringify(localDefinition.value) !== baseline.value,
);

/** Variants, default and rules: admin/developer only (capability matrix). */
const canEditDefinition = computed(() => capabilities.value.canEditDefinitions);
/**
 * `enabled` may be toggled by every role, but a product owner cannot create a definition, so
 * their toggle needs an existing one (FR-59).
 */
const canToggle = computed(
  () =>
    canEditDefinition.value ||
    (capabilities.value.canToggle && hasDefinition.value),
);
const canSave = computed(() => canToggle.value);
const readOnlyDefinition = computed(
  () => capabilities.value.canView && !canEditDefinition.value,
);
const missingDefinitionNote = computed(() =>
  canEditDefinition.value
    ? `No definition in “${env.value}” yet — saving creates it.`
    : `No definition in “${env.value}” yet — an admin or developer must create it.`,
);
const descriptionChanged = computed(
  () => description.value !== (flagsStore.detail?.description ?? ''),
);

const variantItems = computed(() =>
  Object.keys(localDefinition.value.variants).map((name) => ({
    label: name,
    value: name,
  })),
);
const copySourceEnvs = computed(() =>
  environments.value
    .filter(
      (envName) =>
        envName !== env.value && flagsStore.detail?.definitions[envName],
    )
    .map((envName) => ({ label: envName, value: envName })),
);

function tabLabel(envName: string): string {
  const stored = flagsStore.detail?.definitions[envName];
  if (!stored) return `${envName} · not configured`;
  return `${envName} · ${stored.enabled ? 'on' : 'off'}`;
}

/** (Re)start the draft from the stored definition of the selected environment. */
function loadDraft(): void {
  localDefinition.value = draftOf(storedDefinition.value);
  baseline.value = JSON.stringify(localDefinition.value);
  serverChanged.value = false;
  problems.value = [];
}

onMounted(async () => {
  env.value = environments.value[0] ?? '';
  try {
    if (flagsStore.projectId !== projectId.value) {
      await flagsStore.setActiveProject(projectId.value);
    }
    await flagsStore.openFlag(routeFlagKey.value);
    description.value = flagsStore.detail?.description ?? '';
  } catch (error) {
    loadError.value = errorMessage(error, 'Failed to load the flag');
  }
});

// The stored flag changed (own save, another user, live event): follow it unless that would
// throw away unsaved edits — then say so and let the user decide.
watch(
  () => flagsStore.detail,
  () => {
    const storedDraft = JSON.stringify(draftOf(storedDefinition.value));
    if (storedDraft === baseline.value) return;
    if (isDirty.value) {
      serverChanged.value = true;
      return;
    }
    loadDraft();
  },
);

watch(env, () => {
  // Environments are isolated (FR-8): each tab starts from its own stored definition, or a
  // pristine one when the environment has none.
  loadDraft();
  copyFromEnv.value = null;
  savedNotice.value = null;
  errorMessageText.value = null;
});

function setEnabled(enabled: boolean): void {
  if (!canToggle.value) return;
  localDefinition.value.enabled = enabled;
}

function setVariants(variants: Record<string, VariantValue>): void {
  localDefinition.value.variants = variants;
}

function describeProblems(
  list: Array<{ pointer: string; message: string }>,
): string[] {
  return list.map((problem) => `${problem.pointer}: ${problem.message}`);
}

function reportFailure(error: unknown, fallback: string): void {
  const fromApi = apiValidationProblems(error);
  if (error instanceof DefinitionValidationError) {
    problems.value = describeProblems(error.problems);
    return;
  }
  problems.value = describeProblems(fromApi);
  errorMessageText.value = errorMessage(error, fallback);
}

async function save(): Promise<void> {
  if (!canSave.value || saving.value) return;
  savedNotice.value = null;
  errorMessageText.value = null;
  // FR-14: every problem at once, from the same validator the server runs (ADR-0006).
  const found = validateDefinition(localDefinition.value);
  problems.value = describeProblems(found);
  if (found.length > 0) return;
  saving.value = true;
  try {
    const previousVersion = flagsStore.detail?.version;
    const version = await flagsStore.saveDefinition(
      routeFlagKey.value,
      env.value,
      localDefinition.value,
    );
    loadDraft();
    savedNotice.value =
      version === previousVersion
        ? `No changes — flag stays at v${version}`
        : `Saved · flag v${previousVersion} → v${version}`;
  } catch (error) {
    reportFailure(error, 'Save failed');
  } finally {
    saving.value = false;
  }
}

async function saveDescription(): Promise<void> {
  savingDescription.value = true;
  errorMessageText.value = null;
  try {
    await flagsStore.updateDescription(routeFlagKey.value, description.value);
    savedNotice.value = 'Description saved';
  } catch (error) {
    reportFailure(error, 'Failed to save the description');
  } finally {
    savingDescription.value = false;
  }
}

async function copyFrom(): Promise<void> {
  const fromEnv = copyFromEnv.value;
  if (!fromEnv || !capabilities.value.canEditDefinitions) return;
  copying.value = true;
  errorMessageText.value = null;
  savedNotice.value = null;
  try {
    const version = await flagsStore.copy(
      routeFlagKey.value,
      env.value,
      fromEnv,
    );
    // A copy is a full replacement of the target definition (FR-9): the draft follows it.
    loadDraft();
    savedNotice.value = `Copied “${fromEnv}” → “${env.value}” · flag v${version}`;
  } catch (error) {
    reportFailure(error, 'Copy failed');
  } finally {
    copying.value = false;
  }
}

async function deleteFlag(): Promise<void> {
  errorMessageText.value = null;
  try {
    await flagsStore.deleteFlag(routeFlagKey.value);
    await router.push(`/projects/${projectId.value}/flags`);
  } catch (error) {
    reportFailure(error, 'Failed to delete the flag');
  }
}

function back(): void {
  void router.push(`/projects/${projectId.value}/flags`);
}
</script>

<style scoped>
.title-key {
  font-size: 20px;
}
.editor-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: var(--space-xl);
  align-items: start;
}
.meta-list {
  display: grid;
  gap: var(--space-md);
  margin: 0;
}
.meta-list dt {
  font-size: 12px;
  color: var(--ink-3);
}
.meta-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.editor-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  min-width: 0;
}
.definition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
  margin-bottom: var(--space-md);
}
.enabled-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-3);
}
.field-heading {
  font-size: 14px;
  font-weight: 600;
}
.default-variant {
  max-width: 300px;
}
/* Sticky save bar: the save path stays reachable however long the definition is. */
.save-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
}
.save-actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.save-spacer {
  flex: 1;
}
.copy-row {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}
.copy-source {
  width: 180px;
}
.saved-notice {
  color: var(--ok-700);
  font-weight: 600;
}

@media (max-width: 960px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
  /* On small screens a pinned bar would cover too much of the definition. */
  .save-bar {
    position: static;
    box-shadow: none;
  }
}
</style>
