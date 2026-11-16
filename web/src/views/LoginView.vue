<template>
  <main class="login-page">
    <section class="card login-card" aria-labelledby="login-title">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">F</span>
        <span>
          <strong class="brand-name">FMS</strong>
          <span class="caption"> — Flag Management</span>
        </span>
      </div>
      <div>
        <h1 id="login-title" class="page-title">Sign in</h1>
        <p class="page-subtitle">Use your FMS account for this instance</p>
      </div>

      <n-alert
        v-if="errorMessage"
        type="error"
        :show-icon="true"
        :title="errorMessage"
        role="alert"
      />

      <form class="form" novalidate @submit.prevent="submit">
        <n-form-item
          label="Username"
          :validation-status="usernameError ? 'error' : undefined"
          :feedback="usernameError ?? undefined"
        >
          <n-input
            v-model:value="username"
            placeholder="admin"
            :input-props="{ autocomplete: 'username' }"
            data-testid="login-username"
          />
        </n-form-item>
        <n-form-item
          label="Password"
          :validation-status="passwordError ? 'error' : undefined"
          :feedback="passwordError ?? undefined"
        >
          <n-input
            v-model:value="password"
            type="password"
            show-password-on="click"
            placeholder="••••••••"
            :input-props="{ autocomplete: 'current-password' }"
            data-testid="login-password"
          />
        </n-form-item>
        <n-button
          type="primary"
          block
          attr-type="submit"
          :loading="loading"
          data-testid="login-submit"
          >Sign in</n-button
        >
      </form>

      <p class="caption">
        No self-signup — accounts are created by admin invite.
      </p>
      <hr class="divider" />
      <p class="caption">Self-hosted instance</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NFormItem, NInput } from 'naive-ui';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref<string | null>(null);
const usernameError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

async function submit(): Promise<void> {
  if (loading.value) return;
  errorMessage.value = null;
  usernameError.value = username.value ? null : 'Enter your username';
  passwordError.value = password.value ? null : 'Enter your password';
  if (usernameError.value || passwordError.value) return;
  loading.value = true;
  const ok = await session.login(username.value, password.value);
  loading.value = false;
  if (ok) {
    await router.push('/projects');
  } else {
    errorMessage.value = 'Invalid username or password';
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: var(--space-lg);
}
.login-card {
  width: 100%;
  max-width: 400px;
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.brand-mark {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--brand-600);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 700;
}
.brand-name {
  font-size: 16px;
}
</style>
