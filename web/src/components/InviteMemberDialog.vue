<template>
  <app-dialog
    :show="show"
    :title="invited ? 'User invited' : 'Invite user'"
    @update:show="close"
  >
    <section
      v-if="invited"
      class="secret-panel"
      role="status"
      data-testid="member-invited"
    >
      <p>
        <strong>{{ invited.user }}</strong> can now sign in with this temporary
        password.
      </p>
      <code class="secret-value" data-testid="member-password">{{
        invited.password
      }}</code>
      <p class="banner">
        Shown once — only its hash is stored. Copy it now and pass it to the
        user.
      </p>
      <div class="form-actions">
        <n-button type="primary" @click="close(false)"
          >I have copied the password</n-button
        >
      </div>
    </section>

    <form v-else class="form invite-form" @submit.prevent="invite">
      <n-form-item label="Username">
        <n-input
          v-model:value="username"
          placeholder="jane.doe"
          data-testid="member-username"
        />
      </n-form-item>
      <n-form-item
        label="Global role"
        feedback="Applies to every project the user is assigned to."
      >
        <n-select
          v-model:value="globalRole"
          :options="roleOptions"
          data-testid="member-global-role"
        />
      </n-form-item>
      <fieldset class="project-roles">
        <legend class="field-label">Project roles</legend>
        <p v-if="session.projects.length === 0" class="hint">
          Create a project first — an invite needs at least one project role.
        </p>
        <div
          v-for="project in session.projects"
          :key="project.id"
          class="project-role-row"
        >
          <label :for="`project-role-${project.id}`">{{ project.name }}</label>
          <n-select
            :value="projectRoles[project.id] ?? NO_ACCESS"
            :options="projectRoleOptions"
            :input-props="{ id: `project-role-${project.id}` }"
            :data-testid="`member-project-role-${project.key}`"
            @update:value="(role: string) => (projectRoles[project.id] = role)"
          />
        </div>
      </fieldset>
      <p class="hint">
        A project role can raise a user above the global role on that project,
        never lower it. Re-inviting an existing user updates the global role and
        the listed project roles and issues a new temporary password; roles on
        unlisted projects are kept.
      </p>
      <n-alert
        v-if="errorMessageText"
        type="error"
        :show-icon="true"
        :title="errorMessageText"
        role="alert"
        data-testid="member-error"
      />
      <div class="form-actions">
        <n-button
          type="primary"
          attr-type="submit"
          :loading="submitting"
          data-testid="member-invite-submit"
          >Send invite</n-button
        >
        <n-button :disabled="submitting" @click="close(false)">Cancel</n-button>
      </div>
    </form>
  </app-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { NAlert, NButton, NFormItem, NInput, NSelect } from 'naive-ui';
import { ROLES } from '@fms/shared';
import { useSessionStore } from '../stores/session';
import { api } from '../api/client';
import { errorMessage } from '../api/errors';
import type { InviteResult } from '../api/types';
import AppDialog from './AppDialog.vue';

/**
 * Invite dialog (FR-57): username, global role and independent per-project roles. On success
 * the form is replaced by the temporary password, which stays until the admin closes it.
 */
const NO_ACCESS = 'none';

const props = defineProps<{
  show: boolean;
  /** Pre-select a role on this project (the Project access screen). */
  presetProjectId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:show', show: boolean): void;
  (e: 'invited', result: InviteResult): void;
}>();

const session = useSessionStore();

const username = ref('');
const globalRole = ref<string>('developer');
const projectRoles = reactive<Record<string, string>>({});
const submitting = ref(false);
const errorMessageText = ref<string | null>(null);
const invited = ref<InviteResult | null>(null);

const roleOptions = ROLES.map((role) => ({ label: role, value: role }));
const projectRoleOptions = [
  { label: 'no access', value: NO_ACCESS },
  ...roleOptions,
];

function reset(): void {
  username.value = '';
  globalRole.value = 'developer';
  for (const projectId of Object.keys(projectRoles))
    delete projectRoles[projectId];
  if (props.presetProjectId) projectRoles[props.presetProjectId] = 'developer';
  errorMessageText.value = null;
  invited.value = null;
}

// Every opening starts from a clean form; a previous one-time password is never re-shown.
watch(
  () => props.show,
  (show) => {
    if (show) reset();
  },
  { immediate: true },
);

function close(show: boolean): void {
  if (show) return;
  invited.value = null;
  emit('update:show', false);
}

async function invite(): Promise<void> {
  const name = username.value.trim();
  const assignments = session.projects
    .map((project) => ({
      projectId: project.id,
      role: projectRoles[project.id] ?? NO_ACCESS,
    }))
    .filter((assignment) => assignment.role !== NO_ACCESS);
  if (name.length === 0) {
    errorMessageText.value = 'A username is required';
    return;
  }
  if (assignments.length === 0) {
    errorMessageText.value = 'Assign a role on at least one project';
    return;
  }
  submitting.value = true;
  try {
    const result = await api.inviteMember({
      username: name,
      role: globalRole.value,
      projects: assignments,
    });
    invited.value = result;
    errorMessageText.value = null;
    emit('invited', result);
  } catch (error) {
    errorMessageText.value = errorMessage(error, 'Failed to invite the user');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.project-roles {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-md);
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.project-role-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: var(--space-sm);
  align-items: center;
}
.project-role-row label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 480px) {
  .project-role-row {
    grid-template-columns: 1fr;
  }
}
</style>
