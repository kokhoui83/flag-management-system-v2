<template>
  <n-config-provider :theme-overrides="{ common: { borderColor: '#e2e8f0' } }">
    <n-message-provider />
    <n-modal-provider />
    <n-notification-provider />
    <n-dialog-provider />
    <router-view />
  </n-config-provider>
</template>

<script setup lang="ts">
// Dashboard shell: Naive UI providers + the routed view. Authentication gating lives in the
// router guard (login gate, FR-40/FR-53).
</script>
