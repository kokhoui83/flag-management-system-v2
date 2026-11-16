<template>
  <main class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Roles &amp; permissions</h1>
        <p class="page-subtitle">
          What each role can do. Disabled controls on other screens follow this
          table.
        </p>
      </div>
    </header>

    <div class="table-card">
      <table class="data-table" data-testid="capability-matrix">
        <caption class="visually-hidden">
          Capability matrix: capabilities by role
        </caption>
        <thead>
          <tr>
            <th scope="col">Capability</th>
            <th scope="col">Scope</th>
            <th v-for="role in ROLES" :key="role" scope="col">
              <role-tag :role="role" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in matrix" :key="row.capability">
            <th scope="row">{{ row.capability }}</th>
            <td>
              <span class="pill pill--muted">{{ row.scope }}</span>
            </td>
            <td
              v-for="role in ROLES"
              :key="role"
              :class="row.allowed[role] ? 'cell-allowed' : 'cell-denied'"
              :data-allowed="row.allowed[role]"
            >
              <span aria-hidden="true">{{
                row.allowed[role] ? '✓' : '—'
              }}</span>
              <span class="visually-hidden">{{
                row.allowed[role] ? 'Allowed' : 'Not allowed'
              }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <section class="card" aria-labelledby="effective-heading">
      <h2 id="effective-heading" class="section-title">
        How permissions combine
      </h2>
      <ul class="notes">
        <li>
          Effective permission = global role ∪ per-project role. A project role
          can raise a user on that project but never lower the global role.
        </li>
        <li>
          The admin column for project-scoped capabilities includes
          project-scoped admins. Global capabilities need the global admin role.
        </li>
        <li>
          Developers and product owners act only on projects they are assigned
          to; any other project is rejected by the API.
        </li>
        <li>
          A product-owner toggle changes the enabled state only; every other
          definition field must stay unchanged.
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ROLES } from '@fms/shared';
import { capabilityMatrix } from '../capabilityMatrix';
import RoleTag from '../components/RoleTag.vue';

/** Read-only capability matrix (FR-54/FR-58/FR-59), derived from the same rules that gate the UI. */
const matrix = capabilityMatrix();
</script>

<style scoped>
.cell-allowed {
  color: var(--ok-700);
  font-weight: 700;
}
.cell-denied {
  color: var(--ink-4);
}
.notes {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: var(--space-sm);
  color: var(--ink-2);
}
</style>
