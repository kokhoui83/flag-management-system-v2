<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ projectName }} · access</h1>
        <p class="page-subtitle">Who holds a role on this project.</p>
      </div>
      <div class="page-actions">
        <n-button @click="backToFlags">Back to flags</n-button>
        <n-button
          type="primary"
          data-testid="access-add-member"
          @click="inviting = true"
          >Add member</n-button
        >
      </div>
    </header>

    <section class="card policy-card" aria-labelledby="policy-heading">
      <h2 id="policy-heading" class="section-title">Restricted by default</h2>
      <p>
        Users who are not global admins need a role on this project to act on
        it. Effective permission is the union of the global role and the role on
        this project; a project role can raise a user here, never lower them. A
        project <code>admin</code> role grants admin capabilities on this
        project only.
      </p>
    </section>

    <n-alert
      v-if="loadError"
      type="error"
      :show-icon="true"
      :title="loadError"
      role="alert"
    >
      <n-button size="small" @click="load">Retry</n-button>
    </n-alert>

    <n-spin :show="loading">
      <div
        v-if="!loading && !loadError && members.length === 0"
        class="card empty-state"
        data-testid="access-empty"
      >
        <strong>No members on this project yet</strong>
        <span>Global admins always have access.</span>
      </div>
      <div v-if="members.length > 0" class="table-card">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role on this project</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in members"
              :key="member.user"
              data-testid="access-row"
            >
              <th scope="row">{{ member.user }}</th>
              <td><role-tag :role="member.role" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </n-spin>

    <p class="caption">
      To change a member's role, add them again with the new role — the user
      gets a new temporary password. Removing a member from a project is not
      available yet.
    </p>

    <invite-member-dialog
      v-model:show="inviting"
      :preset-project-id="projectId"
      @invited="load"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { useSessionStore } from '../stores/session';
import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import type { MemberAssignment } from '../api/types';
import InviteMemberDialog from '../components/InviteMemberDialog.vue';
import RoleTag from '../components/RoleTag.vue';

/**
 * Per-project membership (FR-54/FR-57), read from `GET …/projects/:id/members`. Roles are
 * granted through the standard invite; a standalone role change or removal has no API yet,
 * so neither is offered here.
 */
const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const projectId = computed(() => String(route.params.projectId ?? ''));
const projectName = computed(
  () =>
    session.projects.find((candidate) => candidate.id === projectId.value)
      ?.name ?? 'Project',
);

const members = ref<MemberAssignment[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const inviting = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = null;
  try {
    members.value = await api.listMembers(projectId.value);
  } catch (error) {
    loadError.value = errorMessage(error, 'Failed to load the members');
  } finally {
    loading.value = false;
  }
}

function backToFlags(): void {
  void router.push(`/projects/${projectId.value}/flags`);
}

onMounted(load);
</script>

<style scoped>
.policy-card {
  border-left: 4px solid var(--brand-600);
  color: var(--ink-2);
}
</style>
