<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ projectName }}</h1>
        <p class="page-subtitle">
          Environment health and flag status ·
          <code>{{ projectKey }}</code>
        </p>
      </div>
      <div class="page-actions">
        <n-button
          v-if="session.isAdmin"
          data-testid="project-access"
          @click="openAccess"
          >Project access</n-button
        >
      </div>
    </header>

    <section class="stack" aria-labelledby="env-heading">
      <div class="toolbar">
        <h2 id="env-heading" class="section-title">Environments</h2>
        <form
          v-if="capabilities.canCreateEnvironments"
          class="env-form"
          @submit.prevent="addEnvironment"
        >
          <n-input
            v-model:value="newEnvironment"
            size="small"
            placeholder="qa"
            :input-props="{ 'aria-label': 'New environment name' }"
            data-testid="environment-name"
          />
          <n-button
            size="small"
            attr-type="submit"
            :loading="addingEnvironment"
            data-testid="environment-add"
            >Add environment</n-button
          >
        </form>
      </div>
      <n-alert
        v-if="environmentError"
        type="error"
        :show-icon="true"
        :title="environmentError"
        role="alert"
        data-testid="environment-error"
      />
      <ul class="card-grid env-grid" data-testid="project-environments">
        <li
          v-for="summary in environmentSummaries"
          :key="summary.env"
          class="card env-card"
          :data-env="summary.env"
        >
          <env-chip :env="summary.env" />
          <p class="env-count" data-testid="env-enabled-count">
            {{ summary.enabled }} of {{ flags.length }} enabled
          </p>
          <p v-if="summary.missing > 0" class="caption">
            {{ summary.missing }} not configured
          </p>
          <span
            class="pill"
            :class="summary.health.tone"
            :title="summary.health.detail"
            data-testid="env-health"
          >
            <span class="pill-dot" aria-hidden="true" />{{
              summary.health.label
            }}
          </span>
        </li>
      </ul>
    </section>

    <section class="stack" aria-labelledby="flags-heading">
      <h2 id="flags-heading" class="section-title">Flags</h2>
      <div class="toolbar">
        <div class="toolbar-group">
          <n-input
            v-model:value="search"
            class="search-box"
            clearable
            placeholder="Search flags…"
            :input-props="{ 'aria-label': 'Search flags' }"
            data-testid="flag-search"
          />
          <n-select
            v-model:value="stateFilter"
            class="state-filter"
            :options="stateFilterOptions"
            :input-props="{ 'aria-label': 'Filter flags by state' }"
            data-testid="flag-filter"
          />
        </div>
        <n-button
          v-if="capabilities.canCreateFlags"
          type="primary"
          data-testid="flag-new"
          @click="openCreate"
          >New flag</n-button
        >
        <p v-else class="caption">
          Creating flags requires the admin or developer role.
        </p>
      </div>

      <n-alert
        v-if="loadError"
        type="error"
        :show-icon="true"
        :title="loadError"
        role="alert"
      >
        <n-button size="small" @click="load">Retry</n-button>
      </n-alert>
      <n-alert
        v-if="toggleError"
        type="error"
        :show-icon="true"
        :title="toggleError"
        role="alert"
        closable
        data-testid="toggle-error"
        @close="toggleError = null"
      />

      <n-spin :show="loading">
        <div
          v-if="!loading && !loadError && flags.length === 0"
          class="card empty-state"
          data-testid="flags-empty"
        >
          <strong>No flags yet</strong>
          <span>Create one to start controlling rollout.</span>
        </div>
        <div
          v-else-if="flags.length > 0 && visibleFlags.length === 0"
          class="card empty-state"
        >
          <strong>No flag matches these filters</strong>
          <span>Search looks at flag keys and descriptions.</span>
        </div>

        <div v-if="visibleFlags.length > 0" class="table-card">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col">Flag</th>
                <th scope="col">Version</th>
                <th v-for="env in environments" :key="env" scope="col">
                  {{ env }}
                </th>
                <th scope="col">Sync</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span class="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="flag in visibleFlags"
                :key="flag.key"
                :data-flag="flag.key"
              >
                <th scope="row">
                  <code class="flag-key" data-testid="flag-key">{{
                    flag.key
                  }}</code>
                  <span v-if="flag.description" class="flag-description">{{
                    flag.description
                  }}</span>
                </th>
                <td>
                  <code data-testid="flag-version">v{{ flag.version }}</code>
                </td>
                <td
                  v-for="env in environments"
                  :key="env"
                  :data-testid="`flag-env-${env}`"
                >
                  <span
                    v-if="!flag.environments[env]"
                    class="pill pill--muted"
                    title="No definition in this environment yet"
                    >Not configured</span
                  >
                  <n-popconfirm
                    v-else-if="capabilities.canToggle"
                    :positive-text="
                      flag.environments[env]!.enabled ? 'Turn off' : 'Turn on'
                    "
                    negative-text="Cancel"
                    @positive-click="
                      toggle(flag.key, env, !flag.environments[env]!.enabled)
                    "
                  >
                    <template #trigger>
                      <button
                        type="button"
                        class="pill"
                        :class="
                          flag.environments[env]!.enabled
                            ? 'pill--ok'
                            : 'pill--bad'
                        "
                        :disabled="toggling === `${flag.key}:${env}`"
                        :aria-label="`${flag.key} is ${
                          flag.environments[env]!.enabled ? 'on' : 'off'
                        } in ${env} — change`"
                        data-testid="flag-toggle"
                      >
                        {{ flag.environments[env]!.enabled ? 'ON' : 'OFF' }}
                      </button>
                    </template>
                    Turn “{{ flag.key }}”
                    {{ flag.environments[env]!.enabled ? 'off' : 'on' }} in
                    {{ env }}?
                  </n-popconfirm>
                  <span
                    v-else
                    class="pill"
                    :class="
                      flag.environments[env]!.enabled ? 'pill--ok' : 'pill--bad'
                    "
                    >{{ flag.environments[env]!.enabled ? 'ON' : 'OFF' }}</span
                  >
                </td>
                <td>
                  <sync-health-badge
                    :flag-key="flag.key"
                    :flag-version="flag.version"
                    :observed="flagsStore.observed[flag.key] ?? null"
                    :unavailable="flagsStore.observedFailed[flag.key] === true"
                  />
                </td>
                <td :title="formatTimestamp(flag.updatedAt)">
                  {{ formatRelative(flag.updatedAt) }}
                </td>
                <td>
                  <n-button
                    size="small"
                    :aria-label="`Open ${flag.key}`"
                    @click="openEditor(flag.key)"
                    >Open</n-button
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </n-spin>
    </section>

    <app-dialog v-model:show="creating" title="Create flag" placement="side">
      <form class="form" @submit.prevent="createFlag">
        <n-form-item label="Name">
          <n-input
            v-model:value="createName"
            placeholder="New payment flow"
            data-testid="flag-name-input"
          />
        </n-form-item>
        <n-form-item
          label="Key"
          feedback="Unique in this project. Suggested from the name; cannot be changed later."
        >
          <n-input
            :value="createKey"
            placeholder="new-payment-flow"
            data-testid="flag-key-input"
            @update:value="editKey"
          />
        </n-form-item>
        <n-form-item label="Description">
          <n-input
            v-model:value="createDescription"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="What this flag controls"
            data-testid="flag-description-input"
          />
        </n-form-item>
        <p class="banner banner--info">
          The flag is available in every environment of the project. Each
          environment starts without a definition until you configure it.
        </p>
        <div
          v-if="createProblems.length > 0"
          class="validation-panel"
          role="alert"
          data-testid="create-problems"
        >
          <ol>
            <li v-for="problem in createProblems" :key="problem">
              {{ problem }}
            </li>
          </ol>
        </div>
        <div class="form-actions">
          <n-button
            type="primary"
            attr-type="submit"
            :loading="submittingCreate"
            data-testid="flag-create"
            >Create</n-button
          >
          <n-button :disabled="submittingCreate" @click="creating = false"
            >Cancel</n-button
          >
        </div>
      </form>
    </app-dialog>
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
} from 'naive-ui';
import { validateEnvName, validateFlagKey } from '@fms/shared';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import { errorMessage } from '../api/errors';
import { formatRelative, formatTimestamp, suggestFlagKey } from '../format';
import AppDialog from '../components/AppDialog.vue';
import EnvChip from '../components/EnvChip.vue';
import SyncHealthBadge from '../components/SyncHealthBadge.vue';

const route = useRoute();
const router = useRouter();
const flagsStore = useFlagsStore();
const session = useSessionStore();

const loading = ref(true);
const loadError = ref<string | null>(null);
const newEnvironment = ref('');
const addingEnvironment = ref(false);
const environmentError = ref<string | null>(null);
const search = ref('');
const stateFilter = ref('all');
const toggling = ref<string | null>(null);
const toggleError = ref<string | null>(null);

const creating = ref(false);
const createName = ref('');
const createKey = ref('');
/** Until the user edits the key, it follows the name. */
const keyEdited = ref(false);
const createDescription = ref('');
const createProblems = ref<string[]>([]);
const submittingCreate = ref(false);

const flags = computed(() => flagsStore.flags);
const projectId = computed(() =>
  String(route.params.projectId ?? session.selectedProjectId ?? ''),
);
const project = computed(() =>
  session.projects.find((candidate) => candidate.id === projectId.value),
);
const projectName = computed(() => project.value?.name ?? 'Flags');
const projectKey = computed(() => project.value?.key ?? '');
const environments = computed(() => project.value?.environments ?? []);
const capabilities = computed(() => session.capabilitiesFor(projectId.value));

const stateFilterOptions = computed(() => [
  { label: 'All flags', value: 'all' },
  ...environments.value.map((env) => ({
    label: `Enabled in ${env}`,
    value: env,
  })),
]);

const visibleFlags = computed(() => {
  const needle = search.value.trim().toLowerCase();
  return flags.value.filter((flag) => {
    const matchesSearch =
      !needle ||
      flag.key.toLowerCase().includes(needle) ||
      flag.description.toLowerCase().includes(needle);
    const matchesState =
      stateFilter.value === 'all' ||
      flag.environments[stateFilter.value]?.enabled === true;
    return matchesSearch && matchesState;
  });
});

interface Health {
  label: string;
  tone: string;
  detail: string;
}

/**
 * Aggregate sync health of one environment. The stored version belongs to a flag, so the
 * summary counts flags rather than naming one environment-wide version (FR-47).
 */
function healthOf(env: string): Health {
  const configured = flags.value.filter((flag) => flag.environments[env]);
  if (configured.length === 0) {
    return {
      label: 'Nothing to sync',
      tone: 'pill--muted',
      detail: 'No flag has a definition in this environment',
    };
  }
  const unavailable = configured.filter(
    (flag) => flagsStore.observedFailed[flag.key],
  ).length;
  if (unavailable > 0) {
    return {
      label: 'Sync unavailable',
      tone: 'pill--bad',
      detail:
        'flagd did not answer — it may be unreachable or not syncing this project',
    };
  }
  const versions = configured.map(
    (flag) => flagsStore.observed[flag.key]?.[env]?.version,
  );
  const unknown = versions.filter((version) => version === undefined).length;
  const stale = configured.filter(
    (flag, index) =>
      versions[index] !== undefined && versions[index] !== flag.version,
  ).length;
  if (stale > 0) {
    return {
      label: `Stale · ${stale} ${stale === 1 ? 'flag' : 'flags'}`,
      tone: 'pill--warn',
      detail: 'flagd serves an older version of these flags',
    };
  }
  if (unknown > 0) {
    return {
      label: 'Sync unknown',
      tone: 'pill--muted',
      detail: 'flagd has not reported what it serves for every flag',
    };
  }
  return {
    label: 'Synced',
    tone: 'pill--ok',
    detail: 'flagd serves the stored version of every flag',
  };
}

const environmentSummaries = computed(() =>
  environments.value.map((env) => ({
    env,
    enabled: flags.value.filter((flag) => flag.environments[env]?.enabled)
      .length,
    missing: flags.value.filter((flag) => !flag.environments[env]).length,
    health: healthOf(env),
  })),
);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    await flagsStore.setActiveProject(projectId.value);
  } catch (error) {
    loadError.value = errorMessage(error, 'Failed to load flags');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  session.setSelectedProject(projectId.value);
  void load();
});

async function addEnvironment(): Promise<void> {
  const env = newEnvironment.value.trim();
  const problems = validateEnvName(env);
  if (problems.length > 0) {
    environmentError.value = problems
      .map((problem) => problem.message)
      .join('; ');
    return;
  }
  addingEnvironment.value = true;
  try {
    await session.createEnvironment(projectId.value, env);
    newEnvironment.value = '';
    environmentError.value = null;
  } catch (error) {
    environmentError.value = errorMessage(error, 'Failed to add environment');
  } finally {
    addingEnvironment.value = false;
  }
}

async function toggle(
  flagKey: string,
  env: string,
  enabled: boolean,
): Promise<void> {
  toggling.value = `${flagKey}:${env}`;
  toggleError.value = null;
  try {
    await flagsStore.setEnabled(flagKey, env, enabled);
  } catch (error) {
    toggleError.value = errorMessage(
      error,
      `Failed to change ${flagKey} in ${env}`,
    );
  } finally {
    toggling.value = null;
  }
}

function openCreate(): void {
  createName.value = '';
  createKey.value = '';
  keyEdited.value = false;
  createDescription.value = '';
  createProblems.value = [];
  creating.value = true;
}

function editKey(value: string): void {
  createKey.value = value;
  keyEdited.value = true;
}

// Live key preview: the key follows the name until the user takes over the key field.
watch(createName, (name) => {
  if (!keyEdited.value) createKey.value = suggestFlagKey(name);
});

async function createFlag(): Promise<void> {
  const problems = validateFlagKey(createKey.value);
  createProblems.value = problems.map((problem) => problem.message);
  if (problems.length > 0) return;
  submittingCreate.value = true;
  try {
    await flagsStore.createFlag(createKey.value, createDescription.value);
    creating.value = false;
    await router.push(`/projects/${projectId.value}/flags/${createKey.value}`);
  } catch (error) {
    createProblems.value = [errorMessage(error, 'Failed to create the flag')];
  } finally {
    submittingCreate.value = false;
  }
}

function openEditor(flagKey: string): void {
  void router.push(`/projects/${projectId.value}/flags/${flagKey}`);
}

function openAccess(): void {
  void router.push(`/projects/${projectId.value}/access`);
}
</script>

<style scoped>
.env-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}
.env-card {
  gap: var(--space-sm);
  align-items: flex-start;
}
.env-count {
  font-size: 16px;
  font-weight: 600;
}
.env-form {
  display: flex;
  gap: var(--space-sm);
  flex: 0 1 320px;
}
.state-filter {
  flex: 0 1 200px;
}
.flag-key {
  display: block;
  font-weight: 600;
}
.flag-description {
  display: block;
  font-weight: 400;
  font-size: 13px;
  color: var(--ink-3);
}
</style>
