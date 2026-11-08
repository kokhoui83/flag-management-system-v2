<template>
  <main class="flags-page">
    <n-page-header :title="projectName" :subtitle="`key: ${projectKey}`">
      <n-button size="small" @click="backToProjects">Back</n-button>
      <n-button
        v-if="canCreateFlags"
        type="primary"
        size="small"
        @click="goCreateFlag"
        >New flag</n-button
      >
    </n-page-header>

    <n-spin :show="loading">
      <n-empty
        v-if="flags.length === 0"
        description="No flags yet — create one to start controlling rollout."
      />

      <n-card v-for="flag in flags" :key="flag.key" class="flag-card">
        <div class="flag-head">
          <n-text strong class="flag-key" data-testid="flag-key">{{
            flag.key
          }}</n-text>
          <n-tag size="small">version {{ flag.version }}</n-tag>
          <n-tag
            v-if="isFlagEnabledInAnyEnv(flag.key)"
            size="small"
            type="success"
            >enabled</n-tag
          >
          <n-tag v-else size="small" type="default">disabled</n-tag>
        </div>
        <n-text v-if="flag.description" depth="2">{{
          flag.description
        }}</n-text>
        <div class="flag-envs">
          <n-tag
            v-for="[env, status] in envEntries(flag.key)"
            :key="env"
            size="small"
            :type="status.enabled ? 'success' : 'default'"
            :data-testid="`flag-env-${env}`"
          >
            {{ env }}: {{ status.enabled ? 'on' : 'off' }}
          </n-tag>
        </div>
        <div class="flag-actions">
          <n-button size="small" @click="openEditor(flag.key)">Edit</n-button>
          <sync-health-badge
            :flag-key="flag.key"
            :flag-version="flag.version"
            :observed="observedFor(flag.key)"
          />
        </div>
      </n-card>
    </n-spin>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NCard, NEmpty, NPageHeader, NSpin, NTag } from 'naive-ui';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore, effectiveRoleFor } from '../stores/session';
import SyncHealthBadge from '../components/SyncHealthBadge.vue';

const route = useRoute();
const router = useRouter();
const flagsStore = useFlagsStore();
const session = useSessionStore();

const loading = ref(true);
const flags = computed(() => flagsStore.flags);
const projectId = computed(() =>
  String(route.params.projectId ?? session.selectedProjectId ?? ''),
);
const project = computed(() =>
  session.projects.find((candidate) => candidate.id === projectId.value),
);
const projectName = computed(() => project.value?.name ?? 'Flags');
const projectKey = computed(() => project.value?.key ?? '');
const canCreateFlags = computed(() => {
  const role = effectiveRoleFor(
    session.globalRole,
    session.assignments,
    projectId.value,
  );
  return session.isAdmin || role === 'developer';
});

onMounted(async () => {
  await flagsStore.setActiveProject(projectId.value);
  loading.value = false;
});

const envEntries = (
  flagKey: string,
): Array<[string, { enabled: boolean; variantType: string }]> => {
  const flag = flags.value.find((candidate) => candidate.key === flagKey);
  return Object.entries(flag?.environments ?? {}) as Array<
    [string, { enabled: boolean; variantType: string }]
  >;
};

function isFlagEnabledInAnyEnv(flagKey: string): boolean {
  const flag = flags.value.find((candidate) => candidate.key === flagKey);
  return Object.values(flag?.environments ?? {}).some(
    (status) => status.enabled,
  );
}

function observedFor(
  flagKey: string,
): Record<
  string,
  { version: number; enabled: boolean; variantType: string }
> | null {
  const observedForFlag = (
    flagsStore.observed as Record<
      string,
      Record<string, { version: number; enabled: boolean; variantType: string }>
    >
  )[flagKey];
  return observedForFlag ?? null;
}

function openEditor(flagKey: string): void {
  void router.push(`/projects/${projectId.value}/flags/${flagKey}`);
}

function goCreateFlag(): void {
  void router.push(`/projects/${projectId.value}/flags/new`);
}

function backToProjects(): void {
  void router.push('/projects');
}
</script>

<style scoped>
.flags-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.flag-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.flag-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.flag-key {
  font-size: 16px;
}
.flag-envs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.flag-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
