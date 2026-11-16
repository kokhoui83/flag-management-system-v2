<template>
  <div class="app-shell" :class="{ 'app-shell--rail-open': railOpen }">
    <!-- Not a fragment link: with hash routing `#app-content` would be taken for a route. -->
    <a class="skip-link" href="#/" @click.prevent="skipToContent"
      >Skip to content</a
    >

    <div
      v-if="railOpen"
      class="rail-backdrop"
      data-testid="rail-backdrop"
      @click="railOpen = false"
    />
    <aside
      id="app-rail"
      class="app-rail"
      ref="rail"
      :class="{ 'app-rail--open': railOpen }"
    >
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">F</span>
        <span class="brand-text">
          <strong>FMS</strong>
          <span class="overline">Flag management</span>
        </span>
      </div>

      <nav class="rail-nav" aria-label="Main">
        <router-link class="rail-link" to="/projects">Projects</router-link>
        <router-link class="rail-link" to="/playground">Playground</router-link>
        <template v-if="session.isAdmin">
          <span class="overline rail-section">Admin</span>
          <router-link class="rail-link" to="/api-keys">API keys</router-link>
          <router-link class="rail-link" to="/audit">Audit log</router-link>
          <router-link class="rail-link" to="/members">Members</router-link>
          <router-link class="rail-link" to="/roles"
            >Roles &amp; permissions</router-link
          >
        </template>
      </nav>

      <div class="rail-footer">
        <router-link class="rail-link" to="/guide">User guide</router-link>
        <div class="user-card">
          <span class="avatar" aria-hidden="true">{{
            initialsOf(session.username ?? '')
          }}</span>
          <span class="user-identity" data-testid="session-user">
            <strong class="user-name">{{ session.username }}</strong>
            <role-tag
              :role="session.isAdmin ? 'admin' : session.globalRole"
              fallback="no global role"
            />
          </span>
          <n-button
            size="small"
            quaternary
            data-testid="logout"
            @click="signOut"
            >Sign out</n-button
          >
        </div>
      </div>
    </aside>

    <div class="app-main">
      <header class="app-topbar">
        <n-button
          class="rail-toggle"
          size="small"
          quaternary
          aria-controls="app-rail"
          :aria-expanded="railOpen"
          data-testid="rail-toggle"
          @click="railOpen = !railOpen"
          >Menu</n-button
        >
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li v-for="(crumb, index) in crumbs" :key="crumb.label">
              <router-link
                v-if="crumb.to && index < crumbs.length - 1"
                :to="crumb.to"
                >{{ crumb.label }}</router-link
              >
              <span v-else aria-current="page">{{ crumb.label }}</span>
            </li>
          </ol>
        </nav>
        <span
          class="pill live-pill"
          :class="
            flagsStore.liveState === 'live' ? 'pill--brand' : 'pill--muted'
          "
          data-testid="live-pill"
          role="status"
          :data-live-state="flagsStore.liveState"
          :title="liveTitle"
        >
          <span class="pill-dot" aria-hidden="true" />{{ liveLabel }}
        </span>
      </header>

      <div id="app-content" ref="content" class="app-content" tabindex="-1">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton } from 'naive-ui';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import { initialsOf } from '../format';
import RoleTag from './RoleTag.vue';

/**
 * Authenticated dashboard shell (docs/07-dashboard-design.md §2): the app rail with role-gated
 * navigation and the signed-in identity, the top bar with breadcrumb and live pill, and the
 * content slot. It owns the lifetime of the live change stream (FR-52) — connected while a
 * session is shown, closed on sign-out. Below 960 px the rail becomes an off-canvas menu.
 */
const session = useSessionStore();
const flagsStore = useFlagsStore();
const router = useRouter();
const route = useRoute();

const railOpen = ref(false);
const content = ref<HTMLElement | null>(null);
const rail = ref<HTMLElement | null>(null);

function closeRailOnEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') railOpen.value = false;
}

// While the off-canvas menu is open, keyboard focus moves into it and Escape closes it.
watch(railOpen, async (open) => {
  if (!open) {
    window.removeEventListener('keydown', closeRailOnEscape);
    return;
  }
  window.addEventListener('keydown', closeRailOnEscape);
  await nextTick();
  rail.value?.querySelector<HTMLElement>('a')?.focus();
});

function skipToContent(): void {
  content.value?.focus();
}

interface Crumb {
  label: string;
  to?: string;
}

const SECTION_LABELS: Record<string, string> = {
  playground: 'Playground',
  'api-keys': 'API keys',
  audit: 'Audit log',
  members: 'Members',
  roles: 'Roles & permissions',
  guide: 'User guide',
};

const crumbs = computed<Crumb[]>(() => {
  const name = String(route.name ?? '');
  const section = SECTION_LABELS[name];
  if (section) return [{ label: section }];
  const trail: Crumb[] = [{ label: 'Projects', to: '/projects' }];
  const projectId = route.params.projectId;
  if (typeof projectId !== 'string') return trail;
  const project = session.projects.find(
    (candidate) => candidate.id === projectId,
  );
  trail.push({
    label: project?.name ?? 'Project',
    to: `/projects/${projectId}/flags`,
  });
  if (name === 'project-access') trail.push({ label: 'Access' });
  if (typeof route.params.flagKey === 'string')
    trail.push({ label: route.params.flagKey });
  return trail;
});

const liveLabel = computed(() => {
  if (flagsStore.liveState === 'live') return 'Live';
  if (flagsStore.liveState === 'connecting') return 'Connecting';
  return 'Offline';
});
const liveTitle = computed(() =>
  flagsStore.liveState === 'live'
    ? 'Changes appear here as flagd applies them'
    : 'Live updates are not connected — reload to see the latest state',
);

onMounted(() => flagsStore.connectEvents());
onBeforeUnmount(() => {
  flagsStore.disconnectEvents();
  window.removeEventListener('keydown', closeRailOnEscape);
});

// Navigating closes the off-canvas menu.
watch(
  () => route.fullPath,
  () => {
    railOpen.value = false;
  },
);

async function signOut(): Promise<void> {
  flagsStore.disconnectEvents();
  try {
    await session.logout();
  } catch {
    // The local session is cleared even when the server call fails; the login view follows.
  }
  await router.push('/login');
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
}
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: var(--space-sm);
  top: var(--space-sm);
  z-index: 30;
  background: var(--bg-surface);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
}
.app-rail {
  position: sticky;
  top: 0;
  height: 100vh;
  width: var(--rail-width);
  flex: 0 0 var(--rail-width);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
  padding: var(--space-lg);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-default);
  overflow-y: auto;
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xs);
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
.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.brand-text strong {
  font-size: 16px;
}
.rail-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  flex: 1;
}
.rail-section {
  margin: var(--space-md) var(--space-sm) var(--space-xs);
}
.rail-link {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 0 var(--space-md);
  border-radius: var(--radius-md);
  color: var(--ink-2);
  font-weight: 600;
  font-size: 13px;
  text-decoration: none;
}
.rail-link:hover {
  background: var(--bg-canvas);
  color: var(--ink-1);
}
.rail-link.router-link-active {
  background: var(--brand-50);
  color: var(--brand-700);
}
.rail-footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.user-card {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-md);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}
.user-card .n-button {
  grid-column: 1 / -1;
  justify-self: start;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-sunken);
  color: var(--ink-2);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
}
.user-identity {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}
.user-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 0 var(--space-2xl);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
}
.rail-toggle {
  display: none;
}
.breadcrumb {
  flex: 1;
  min-width: 0;
}
.breadcrumb ol {
  list-style: none;
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  font-size: 13px;
  color: var(--ink-3);
  overflow: hidden;
  white-space: nowrap;
}
.breadcrumb li {
  overflow: hidden;
  text-overflow: ellipsis;
}
.breadcrumb li + li::before {
  content: '/';
  margin: 0 var(--space-sm);
  color: var(--ink-4);
}
.breadcrumb a {
  color: var(--ink-3);
  text-decoration: none;
}
.breadcrumb a:hover {
  color: var(--ink-1);
}
.breadcrumb [aria-current='page'] {
  color: var(--ink-1);
  font-weight: 500;
}
.app-content {
  flex: 1;
  padding: var(--space-2xl);
  outline: none;
}

@media (max-width: 960px) {
  .app-rail {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 25;
    transform: translateX(-100%);
    visibility: hidden;
    transition:
      transform 0.2s ease,
      visibility 0.2s;
  }
  .app-rail--open {
    transform: none;
    visibility: visible;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.2);
  }
  .rail-backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    background: rgba(15, 23, 42, 0.4);
  }
  .rail-toggle {
    display: inline-flex;
  }
  .app-topbar {
    padding: 0 var(--space-lg);
  }
  .app-content {
    padding: var(--space-lg);
  }
}
</style>
