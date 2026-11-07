<template>
  <main class="login-page">
    <n-card class="login-card" title="Flag Management System">
      <n-form @submit.prevent="submit">
        <n-form-item label="Username">
          <n-input
            v-model:value="username"
            placeholder="admin"
            data-testid="login-username"
          />
        </n-form-item>
        <n-form-item label="Password">
          <n-input
            type="password"
            v-model:value="password"
            placeholder="••••••••"
            data-testid="login-password"
          />
        </n-form-item>
      </n-form>
      <n-button
        type="primary"
        block
        :loading="loading"
        @click="submit"
        data-testid="login-submit"
        >Sign in</n-button
      >
      <n-alert
        v-if="errorMessage"
        type="error"
        :show-icon="true"
        :message="errorMessage"
      />
    </n-card>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NAlert, NButton, NCard, NForm, NFormItem, NInput } from 'naive-ui';
import { useSessionStore } from '../stores/session';

const session = useSessionStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMessage = ref<string | null>(null);

async function submit(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = null;
  const ok = await session.login(username.value, password.value);
  loading.value = false;
  if (ok) {
    const router = useRouter();
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
}
.login-card {
  width: 360px;
}
</style>
