<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <app-shell v-if="showShell">
      <router-view />
    </app-shell>
    <router-view v-else />
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { NConfigProvider } from 'naive-ui';
import AppShell from './components/AppShell.vue';
import { useSessionStore } from './stores/session';
import { themeOverrides } from './theme';

// Authenticated routes render inside the shell (navigation, sign-out, live stream); public
// routes (login) render bare. Authentication gating itself lives in the router guard.
const session = useSessionStore();
const route = useRoute();
const showShell = computed(
  () => session.isAuthenticated && route.meta.public !== true,
);
</script>
