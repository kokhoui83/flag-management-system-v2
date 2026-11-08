<template>
  <main class="flag-editor-page">
    <n-page-header
      :title="isCreate ? 'Create flag' : `Edit flag: ${flagKey}`"
      :subtitle="`project: ${projectName}`"
    >
      <n-button size="small" @click="back">Back</n-button>
    </n-page-header>

    <n-form class="editor-form" @submit.prevent="save">
      <n-form-item v-if="isCreate" label="Flag key">
        <n-input v-model:value="flagKey" />
      </n-form-item>

      <n-tabs v-model:value="env">
        <n-tab v-for="envName in environments" :key="envName" :name="envName" />
        <n-tab-pane
          v-for="envName in environments"
          :key="envName"
          :name="envName"
        >
          <n-form-item :label="`Environment: ${envName}`">
            <n-switch
              :checked="localDefinition.enabled"
              @update:checked="(checked: boolean) => setEnabled(checked)"
            />
          </n-form-item>
        </n-tab-pane>
      </n-tabs>

      <section class="variants-section">
        <n-text strong>Variants</n-text>
        <div
          v-for="entry in variantEntries"
          :key="entry[0]"
          class="variant-row"
        >
          <n-input
            :value="String(entry[1])"
            :disabled="!canManage"
            @update:model-value="
              (value: string) => setVariantValue(entry[0], value)
            "
          />
          <span>{{ entry[0] }}</span>
        </div>
        <n-form-item label="Default variant">
          <n-select
            v-model:value="localDefinition.defaultVariant"
            :options="variantItems"
            :disabled="!canManage"
          />
        </n-form-item>
      </section>

      <n-form-item v-if="!isCreate" label="Copy from environment">
        <n-select v-model:value="copyFromEnv" :options="copySourceEnvs" />
        <n-button size="small" @click="copyFrom">Copy</n-button>
      </n-form-item>

      <section class="rules-section">
        <rule-editor
          :rules="localDefinition.rules"
          :variants="localDefinition.variants"
          :disabled="!canManage"
          @update:rules="(rules: FlagRule[]) => (localDefinition.rules = rules)"
        />
      </section>

      <n-button type="primary" :loading="saving" @click="save"
        >Save definition</n-button
      >
      <n-alert
        v-if="errorMessage"
        type="error"
        :show-icon="true"
        :title="errorMessage"
      />
    </n-form>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NAlert,
  NButton,
  NForm,
  NFormItem,
  NInput,
  NPageHeader,
  NSelect,
  NSwitch,
  NTabs,
  NTab,
  NTabPane,
} from 'naive-ui';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore, effectiveRoleFor } from '../stores/session';
import { api } from '../api/client';
import RuleEditor from '../components/RuleEditor.vue';
import {
  validateDefinition,
  type FlagDefinitionInput,
  type FlagRule,
} from '@fms/shared';

const route = useRoute();
const router = useRouter();
const flagsStore = useFlagsStore();
const session = useSessionStore();

const isCreate = computed(() => route.name === 'flag-new');
const routeFlagKey = computed(() => String(route.params.flagKey ?? ''));
const flagKey = ref(isCreate.value ? 'new' : routeFlagKey.value);
const env = ref<string>('');
const saving = ref(false);
const errorMessage = ref<string | null>(null);
const localDefinition = ref<FlagDefinitionInput>({
  enabled: true,
  variants: { on: true, off: false },
  defaultVariant: 'off',
  rules: [],
});

const projectId = computed(() =>
  String(route.params.projectId ?? session.selectedProjectId ?? ''),
);
const projectName = computed(
  () =>
    session.projects.find((candidate) => candidate.id === projectId.value)
      ?.name ?? '',
);
const environments = computed<string[]>(
  () =>
    session.projects.find((candidate) => candidate.id === projectId.value)
      ?.environments ?? ['dev', 'staging', 'prod'],
);
const canManage = computed<boolean>(() => {
  const role = effectiveRoleFor(
    session.globalRole,
    session.assignments,
    projectId.value,
  );
  return session.isAdmin || role === 'developer';
});

const variantEntries = computed(
  () =>
    Object.entries(localDefinition.value.variants) as Array<
      [string, boolean | number | string]
    >,
);
const variantItems = computed(() =>
  variantEntries.value.map(([name]) => ({ label: name, value: name })),
);
const copyFromEnv = ref<string>('');
const copySourceEnvs = computed<Array<{ label: string; value: string }>>(() => {
  const detail = flagsStore.detail;
  const sources: Array<{ label: string; value: string }> = [];
  for (const envName of environments.value) {
    if (envName === env.value) continue;
    if (detail?.definitions[envName])
      sources.push({ label: envName, value: envName });
  }
  return sources;
});

onMounted(async () => {
  env.value = environments.value[0] ?? 'staging';
  if (!isCreate.value) {
    await flagsStore.openFlag(routeFlagKey.value);
  }
});

watch(
  () => flagsStore.detail,
  (detail) => {
    if (isCreate.value || !detail) return;
    const definition = detail.definitions[env.value];
    if (!definition) return;
    localDefinition.value = {
      enabled: definition.enabled,
      variants: definition.variants,
      defaultVariant: definition.defaultVariant,
      rules: definition.rules as FlagRule[],
    };
  },
);

watch(env, (next: string) => {
  const detail = flagsStore.detail;
  const definition = detail?.definitions[next];
  if (!definition) return;
  localDefinition.value = {
    enabled: definition.enabled,
    variants: definition.variants,
    defaultVariant: definition.defaultVariant,
    rules: definition.rules as FlagRule[],
  };
});

async function save(): Promise<void> {
  const problems = validateDefinition(localDefinition.value);
  if (problems.length > 0) {
    errorMessage.value = problems
      .map((problem) => `${problem.pointer}: ${problem.message}`)
      .join(' | ');
    return;
  }
  saving.value = true;
  try {
    if (isCreate.value) {
      const created = await api.createFlag(
        projectId.value,
        flagKey.value,
        'Created from dashboard',
      );
      await api.putDefinition(projectId.value, created.key, env.value, {
        enabled: localDefinition.value.enabled,
        variants: localDefinition.value.variants,
        defaultVariant: localDefinition.value.defaultVariant,
        rules: localDefinition.value.rules,
      });
      await flagsStore.setActiveProject(projectId.value);
      await router.push(`/projects/${projectId.value}/flags`);
      return;
    }
    await flagsStore.saveDefinition(
      routeFlagKey.value,
      env.value,
      localDefinition.value,
    );
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Save failed';
  } finally {
    saving.value = false;
  }
}

function setEnabled(enabled: boolean): void {
  localDefinition.value.enabled = enabled;
}

function setVariantValue(name: string, value: string): void {
  localDefinition.value.variants = {
    ...localDefinition.value.variants,
    [name]: value,
  };
}

async function copyFrom(): Promise<void> {
  if (isCreate.value) return;
  const fromEnv = copyFromEnv.value;
  if (!fromEnv) return;
  await flagsStore.copy(routeFlagKey.value, env.value, fromEnv);
  await flagsStore.openFlag(routeFlagKey.value);
}

function back(): void {
  void router.push(`/projects/${projectId.value}/flags`);
}
</script>

<style scoped>
.flag-editor-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.editor-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.variants-section,
.rules-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.variant-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
