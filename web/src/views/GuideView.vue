<template>
  <main class="page guide-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">User guide</h1>
        <p class="page-subtitle">How to operate the dashboard, task by task.</p>
      </div>
    </header>

    <section class="card" aria-labelledby="guide-signin">
      <h2 id="guide-signin" class="section-title">Sign in and out</h2>
      <ol>
        <li>
          Sign in with your username and password. Accounts are created by an
          admin invite; there is no self-signup.
        </li>
        <li>
          Your session survives a page reload. Use <strong>Sign out</strong> in
          the navigation to end it.
        </li>
        <li>
          The navigation shows only what your role may use. Your global role is
          shown next to your name.
        </li>
      </ol>
    </section>

    <section class="card" aria-labelledby="guide-projects">
      <h2 id="guide-projects" class="section-title">
        Projects and environments
      </h2>
      <ol>
        <li>
          <strong>Projects</strong> lists the projects you are assigned to
          (admins see all). Admins create projects with
          <strong>New project</strong>; a project starts with the environments
          dev, staging and prod.
        </li>
        <li>
          Open a project to see one summary card per environment: how many flags
          are enabled and whether flagd serves the stored versions.
        </li>
        <li>
          Admins and developers add an environment with
          <strong>Add environment</strong> (lowercase letters, digits and
          hyphens; unique within the project).
        </li>
      </ol>
    </section>

    <section class="card" aria-labelledby="guide-flags">
      <h2 id="guide-flags" class="section-title">Flags</h2>
      <ol>
        <li>
          <strong>New flag</strong> opens a drawer: enter a name, check the
          suggested key and create. The flag exists in every environment of the
          project, but each environment has no definition until you save one.
        </li>
        <li>
          Each row shows the stored flag version and one state per environment:
          <strong>ON</strong>, <strong>OFF</strong> or
          <strong>Not configured</strong>.
        </li>
        <li>
          Kill switch: click an ON/OFF pill and confirm to flip that
          environment. Every project role may do this, including product owners.
        </li>
        <li>
          The sync badge compares what flagd serves with the stored version:
          <em>Synced</em>, <em>Stale</em> (flagd is behind),
          <em>Sync unknown</em> (not observed yet) or
          <em>Sync unavailable</em> (flagd could not be reached).
        </li>
      </ol>
    </section>

    <section class="card" aria-labelledby="guide-editor">
      <h2 id="guide-editor" class="section-title">Editing a definition</h2>
      <ol>
        <li>
          Open a flag and pick an environment tab. Environments are independent:
          a change in one never affects another.
        </li>
        <li>
          Set the enabled switch, the variants (all of one value type), the
          default variant and the ordered rules. Rules are checked top to
          bottom; a percentage rule must be last and needs a targeting key at
          evaluation time.
        </li>
        <li>
          <strong>Save changes</strong> checks the whole definition and lists
          every problem at once. A successful save shows the new flag version;
          saving an unchanged definition does not change the version.
        </li>
        <li>
          <strong>Copy from…</strong> replaces the whole definition of the
          selected environment with another environment's, after confirmation.
        </li>
        <li>
          Product owners can change the enabled switch of an existing definition
          only. Deleting a flag is reserved for admins of the project.
        </li>
      </ol>
    </section>

    <section class="card" aria-labelledby="guide-playground">
      <h2 id="guide-playground" class="section-title">Playground</h2>
      <p>
        Pick a project, flag and environment, optionally a targeting key and a
        context JSON object, then <strong>Evaluate</strong>. The result shows
        the value, variant, reason and the flag version flagd evaluated.
        Evaluation needs flagd to sync the project.
      </p>
    </section>

    <section v-if="session.isAdmin" class="card" aria-labelledby="guide-admin">
      <h2 id="guide-admin" class="section-title">Administration</h2>
      <ol>
        <li>
          <strong>Members</strong>: invite a user with a global role and a role
          per project. The temporary password is shown once. Invite a user again
          to change roles; this issues a new temporary password.
        </li>
        <li>
          <strong>Project access</strong> (from a project): who holds a role on
          that project.
        </li>
        <li>
          <strong>API keys</strong>: create keys for flagd (sync) and SDK
          clients (evaluate). The key is shown once; revoking takes effect
          immediately.
        </li>
        <li>
          <strong>Audit log</strong>: every change with actor, action and
          entity; expand a row to see the before/after difference.
        </li>
        <li>
          <strong>Roles &amp; permissions</strong>: the full capability matrix.
        </li>
      </ol>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
</script>

<style scoped>
.guide-page {
  max-width: 820px;
}
.guide-page ol {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: var(--space-sm);
}
.guide-page p,
.guide-page li {
  color: var(--ink-2);
}
</style>
