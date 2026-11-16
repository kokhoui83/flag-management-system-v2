<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Projects</h1>
        <p class="page-subtitle">Browse projects and their environments.</p>
      </div>
    </header>

    <div class="toolbar">
      <div class="toolbar-group">
        <n-input
          v-model:value="search"
          class="search-box"
          clearable
          placeholder="Search projects…"
          :input-props="{ 'aria-label': 'Search projects' }"
          data-testid="project-search"
        />
        <span class="caption" data-testid="project-count">{{
          countLabel
        }}</span>
      </div>
      <n-button
        v-if="session.isAdmin"
        type="primary"
        data-testid="project-new"
        @click="openCreate"
        >New project</n-button
      >
      <p v-else class="caption">Creating projects requires the admin role.</p>
    </div>

    <div v-if="session.projects.length === 0" class="card empty-state">
      <strong>No projects yet</strong>
      <span>{{
        session.isAdmin
          ? 'Create your first project to start managing flags.'
          : 'Ask an admin to assign you to a project.'
      }}</span>
      <n-button v-if="session.isAdmin" type="primary" @click="openCreate"
        >Create your first project</n-button
      >
    </div>
    <div v-else-if="visibleProjects.length === 0" class="card empty-state">
      <strong>No project matches “{{ search }}”</strong>
      <span>Search looks at project names and keys.</span>
    </div>

    <ul v-else class="card-grid project-grid">
      <li
        v-for="project in visibleProjects"
        :key="project.id"
        class="card project-card"
        :data-project="project.key"
      >
        <div>
          <h2 class="section-title">{{ project.name }}</h2>
          <code class="project-key">{{ project.key }}</code>
        </div>
        <ul class="chip-list" aria-label="Environments">
          <li v-for="env in project.environments" :key="env">
            <env-chip :env="env" />
          </li>
        </ul>
        <hr class="divider" />
        <div class="row">
          <span class="caption">Your role</span>
          <role-tag
            :role="session.capabilitiesFor(project.id).role"
            data-testid="project-role"
          />
        </div>
        <div class="row">
          <n-button
            type="primary"
            secondary
            size="small"
            @click="openFlags(project.id)"
            >Open flags</n-button
          >
          <n-button size="small" quaternary @click="openPlayground(project.id)"
            >Playground</n-button
          >
          <n-button
            v-if="session.isAdmin"
            size="small"
            quaternary
            @click="openAccess(project.id)"
            >Access</n-button
          >
        </div>
      </li>
    </ul>

    <app-dialog v-model:show="creatingProject" title="New project">
      <form class="form" @submit.prevent="create">
        <n-form-item label="Project name">
          <n-input
            v-model:value="createName"
            placeholder="Billing service"
            data-testid="project-name"
          />
        </n-form-item>
        <n-form-item
          label="Project key"
          feedback="Unique, used in sync URLs. It cannot be changed later."
        >
          <n-input
            v-model:value="createKey"
            placeholder="billing"
            data-testid="project-key"
          />
        </n-form-item>
        <p class="caption">
          The project starts with the environments dev, staging and prod.
        </p>
        <n-alert
          v-if="errorMessage"
          type="error"
          :show-icon="true"
          :title="errorMessage"
          role="alert"
        />
        <div class="form-actions">
          <n-button
            type="primary"
            attr-type="submit"
            :loading="creating"
            data-testid="project-create"
            >Create</n-button
          >
          <n-button :disabled="creating" @click="creatingProject = false"
            >Cancel</n-button
          >
        </div>
      </form>
    </app-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NFormItem, NInput } from 'naive-ui';
import { useSessionStore } from '../stores/session';
import { api } from '../api/client';
import { errorMessage as describeError } from '../api/errors';
import AppDialog from '../components/AppDialog.vue';
import EnvChip from '../components/EnvChip.vue';
import RoleTag from '../components/RoleTag.vue';

const session = useSessionStore();
const router = useRouter();

const search = ref('');
const creatingProject = ref(false);
const createKey = ref('');
const createName = ref('');
const creating = ref(false);
const errorMessage = ref<string | null>(null);

const visibleProjects = computed(() => {
  const needle = search.value.trim().toLowerCase();
  if (!needle) return session.projects;
  return session.projects.filter(
    (project) =>
      project.name.toLowerCase().includes(needle) ||
      project.key.toLowerCase().includes(needle),
  );
});

const countLabel = computed(() => {
  const total = session.projects.length;
  const shown = visibleProjects.value.length;
  const noun = total === 1 ? 'project' : 'projects';
  return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`;
});

function openCreate(): void {
  errorMessage.value = null;
  creatingProject.value = true;
}

async function create(): Promise<void> {
  if (!createKey.value.trim() || !createName.value.trim()) {
    errorMessage.value = 'A project name and key are required';
    return;
  }
  creating.value = true;
  try {
    await api.createProject(createKey.value.trim(), createName.value.trim());
    creatingProject.value = false;
    createKey.value = '';
    createName.value = '';
    errorMessage.value = null;
    await session.loadProjects();
  } catch (error) {
    errorMessage.value = describeError(error, 'Failed to create project');
  } finally {
    creating.value = false;
  }
}

function openFlags(projectId: string): void {
  session.setSelectedProject(projectId);
  void router.push(`/projects/${projectId}/flags`);
}

function openPlayground(projectId: string): void {
  session.setSelectedProject(projectId);
  void router.push('/playground');
}

function openAccess(projectId: string): void {
  void router.push(`/projects/${projectId}/access`);
}
</script>

<style scoped>
.project-grid {
  list-style: none;
  margin: 0;
  padding: 0;
}
.project-key {
  color: var(--ink-3);
}
</style>
