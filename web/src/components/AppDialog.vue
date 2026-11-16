<template>
  <n-drawer
    v-if="placement === 'side'"
    :show="show"
    :width="drawerWidth"
    placement="right"
    :trap-focus="true"
    :auto-focus="true"
    @update:show="(value: boolean) => emit('update:show', value)"
  >
    <n-drawer-content :title="title" closable :native-scrollbar="false">
      <slot />
    </n-drawer-content>
  </n-drawer>
  <n-modal
    v-else
    :show="show"
    preset="card"
    :title="title"
    class="app-dialog"
    :style="{ width: 'min(520px, calc(100vw - 32px))' }"
    :trap-focus="true"
    :auto-focus="true"
    role="dialog"
    aria-modal="true"
    @update:show="(value: boolean) => emit('update:show', value)"
  >
    <slot />
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NDrawer, NDrawerContent, NModal } from 'naive-ui';

/**
 * The dashboard's one dialog: a centered modal, or a side drawer that leaves the page visible
 * behind it. Focus is trapped while open and Escape closes it.
 */
defineProps<{
  show: boolean;
  title: string;
  placement?: 'center' | 'side';
}>();

const emit = defineEmits<{ (e: 'update:show', show: boolean): void }>();

// A drawer never exceeds the viewport, so it stays usable on a phone.
const drawerWidth = computed(() =>
  typeof window === 'undefined' ? 420 : Math.min(420, window.innerWidth),
);
</script>
