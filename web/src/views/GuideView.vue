<template>
  <main class="guide-page">
    <n-page-header
      title="User guide"
      subtitle="How to operate the Flag Management System dashboard (FR-40–FR-47, FR-52–FR-59)."
    />

    <section class="guide-section">
      <h1>Flag Management System — User Guide</h1>

      <h2>1. Sign in and session bootstrap</h2>
      <p>
        Open the dashboard and sign in with a username and password. The first
        credential pair is the bootstrap admin (FR-30); invited users receive a
        temporary password from an admin invite (FR-57).
      </p>
      <ol>
        <li>
          Enter credentials on the login screen; the session cookie is issued
          automatically (FR-40).
        </li>
        <li>
          The dashboard loads your projects via
          <code>GET /api/v1/auth/session</code> and the project list.
        </li>
        <li>
          Log out via the session endpoint; the cookie is cleared (FR-31).
        </li>
      </ol>

      <h2>2. Projects</h2>
      <p>
        Each project groups flags by product area and carries an environment set
        (for example <code>dev</code>, <code>staging</code>, <code>prod</code>).
        Admins can create projects; the create returns <code>409</code> when the
        name or key already exists.
      </p>
      <ul>
        <li>Open a project to list its flags.</li>
        <li>
          Admins manage members per project (global role + per-project
          assignment, temporary password shown once) and can add environments.
        </li>
      </ul>

      <h2>3. Flags and definitions</h2>
      <p>
        Each flag version stores, per environment, an enablement switch,
        variants with values, and targeting rules.
      </p>
      <ul>
        <li>
          <strong>Toggle enablement per environment</strong> (FR-42) — the
          definition is replaced all-at-once and validated before save (FR-14).
        </li>
        <li><strong>Edit variants and default variant</strong> (FR-5).</li>
        <li>
          <strong>Edit targeting rules</strong>: attribute conditions
          (<code>eq</code>, <code>neq</code>, <code>in</code>,
          <code>starts_with</code>, <code>ends_with</code>, <code>gt</code>,
          <code>gte</code>, <code>lt</code>, <code>lte</code>,
          <code>exists</code>) and percentage splits with weights (FR-19).
        </li>
        <li>
          <strong>Copy from another environment</strong> into the selected
          environment (FR-9).
        </li>
      </ul>

      <h2>4. Sync health</h2>
      <p>
        The sync badge compares the stored flag version with the version
        observed by the flag engine per environment (FR-47). A mismatch means
        the stored definition changed after the last sync; the badge refreshes
        automatically on the <code>flag-changed</code> event and on
        <code>provider-ready</code> (FR-52).
      </p>

      <h2>5. Evaluate playground</h2>
      <p>
        Call the management API evaluation proxy with a targeting key and
        context to inspect flag evaluation (FR-22 / FR-44). A targeting key is
        required for flags with a percentage rule (FR-19).
      </p>

      <h2>6. API keys and audit</h2>
      <p>
        Admins create API keys (scopes <code>manage</code> |
        <code>evaluate</code> | <code>sync</code> | <code>all</code>) and revoke
        them; the plaintext is shown once (FR-45). The audit view lists
        management actions with before/after context (FR-46).
      </p>

      <h2>7. Roles and capability matrix</h2>
      <p>
        The effective capability per project is the union of the global role and
        the per-project membership (FR-54). Admins manage; developers author
        flags; product owners toggle <code>enabled</code> only.
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { NPageHeader } from 'naive-ui';
</script>

<style scoped>
.guide-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.guide-section {
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
}
.guide-section h1 {
  font-size: 24px;
  margin: 0;
}
.guide-section h2 {
  font-size: 18px;
  margin: 8px 0 0;
}
.guide-section h3 {
  font-size: 15px;
  margin: 4px 0 0;
}
.guide-section p,
.guide-section li {
  line-height: 1.6;
}
.guide-section ul,
.guide-section ol {
  padding-left: 24px;
  margin: 4px 0;
}
.guide-section code {
  background: #f1f5f9;
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 13px;
}
</style>
