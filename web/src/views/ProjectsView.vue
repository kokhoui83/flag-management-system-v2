<template>
  <main class="projects-page">
    <n-page-header title="Projects" :subtitle="session.username ?? ''">
      <n-button
        v-if="session.isAdmin"
        type="primary"
        @click="creatingProject = true"
        >New project</n-button
      >
    </n-page-header>

    <n-alert
      v-if="errorMessage"
      type="error"
      :show-icon="true"
      :message="errorMessage"
    />

    <n-card
      v-for="project in session.projects"
      :key="project.id"
      class="project-card"
    >
      <n-page-header :title="project.name" :subtitle="`key: ${project.key}`">
        <n-button size="small" @click="openFlags(project.id)"
          >Open flags</n-button
        >
      </n-page-header>
      <n-space size="small" wrap>
        <n-tag v-for="env in project.environments" :key="env" size="small">{{
          env
        }}</n-tag>
      </n-space>
      <n-text depth="2"
        >Members:
        {{
          project.members.map((m) => `${m.user} (${m.role})`).join(', ')
        }}</n-text
      >
    </n-card>

    <n-card v-if="creatingProject">
      <n-form class="create-form" @submit.prevent="create">
        <n-form-item label="Project key">
          <n-input v-model:value="createKey" placeholder="billing" />
        </n-form-item>
        <n-form-item label="Project name">
          <n-input v-model:value="createName" placeholder="Billing service" />
        </n-form-item>
        <n-button type="primary" :loading="creating" @click="create"
          >Create</n-button
        >
        <n-button :disabled="creating" @click="cancelCreate">Cancel</n-button>
      </n-form>
    </n-card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  NAlert,
  NButton,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NPageHeader,
  NSpace,
  NTag,
} from 'naive-ui';
import { useSessionStore } from '../stores/session';
import { useRouter } from 'vue-router';
import { api } from '../api/client';

const session = useSessionStore();
const router = useRouter();

const creatingProject = ref(false);
const createKey = ref('');
const createName = ref('');
const creating = ref(false);
const errorMessage = ref<string | null>(null);

async function create(): Promise<void> {
  creating.value = true;
  try {
    await api.createProject(createKey.value, createName.value);
    creatingProject.value = false;
    errorMessage.value = null;
    await session.loadProjects();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create project';
  } finally {
    creating.value = false;
  }
}

function cancelCreate(): void {
  creatingProject.value = false;
}

function openFlags(projectId: string): void {
  session.setSelectedProject(projectId);
  void router.push(`/projects/${projectId}/flags`);
}
</script>

<style scoped>
.projects-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.project-card {
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
