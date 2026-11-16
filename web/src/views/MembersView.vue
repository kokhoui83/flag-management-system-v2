<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Members</h1>
        <p class="page-subtitle">
          Accounts are created by admin invite — there is no self-signup.
        </p>
      </div>
      <n-button
        type="primary"
        data-testid="member-invite-open"
        @click="inviting = true"
        >Invite user</n-button
      >
    </header>

    <div v-if="members.length === 0" class="card empty-state">
      <strong>No invited members yet</strong>
      <span>Invite a user and give them a role on a project.</span>
    </div>
    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">User</th>
            <th scope="col">Project roles</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="member in members"
            :key="member.user"
            data-testid="member-row"
          >
            <th scope="row">{{ member.user }}</th>
            <td>
              <ul class="chip-list">
                <li
                  v-for="grant in member.grants"
                  :key="grant.projectKey"
                  class="grant"
                >
                  <code>{{ grant.projectKey }}:</code>
                  <role-tag :role="grant.role" />
                </li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="caption">
      The list shows users who hold a role on at least one project. What each
      role may do is listed under
      <router-link to="/roles">Roles &amp; permissions</router-link>. To change
      a role, invite the user again.
    </p>

    <invite-member-dialog v-model:show="inviting" @invited="onInvited" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton } from 'naive-ui';
import { useSessionStore } from '../stores/session';
import InviteMemberDialog from '../components/InviteMemberDialog.vue';
import RoleTag from '../components/RoleTag.vue';

/**
 * Members (FR-57). The list is derived from the project directory — the only member data the
 * API exposes — so it carries no sign-in status or last-activity, which the API does not track.
 */
const session = useSessionStore();
const inviting = ref(false);

interface MemberRow {
  user: string;
  grants: Array<{ projectKey: string; role: string }>;
}

const members = computed<MemberRow[]>(() => {
  const byUser = new Map<string, MemberRow>();
  for (const project of session.projects) {
    for (const member of project.members) {
      const row = byUser.get(member.user) ?? { user: member.user, grants: [] };
      row.grants.push({ projectKey: project.key, role: member.role });
      byUser.set(member.user, row);
    }
  }
  return [...byUser.values()].sort((a, b) => a.user.localeCompare(b.user));
});

async function onInvited(): Promise<void> {
  // Refresh the member list behind the dialog; the one-time password stays in the dialog.
  await session.loadProjects();
}
</script>

<style scoped>
.grant {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
}
</style>
