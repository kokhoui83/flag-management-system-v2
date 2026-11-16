import { createRouter, createWebHashHistory, type Router } from 'vue-router';
import { useSessionStore } from '../stores/session';
import LoginView from '../views/LoginView.vue';
import ProjectsView from '../views/ProjectsView.vue';
import FlagsView from '../views/FlagsView.vue';
import FlagEditorView from '../views/FlagEditorView.vue';
import PlaygroundView from '../views/PlaygroundView.vue';
import ApiKeysView from '../views/ApiKeysView.vue';
import AuditView from '../views/AuditView.vue';
import GuideView from '../views/GuideView.vue';
import MembersView from '../views/MembersView.vue';
import ProjectAccessView from '../views/ProjectAccessView.vue';
import RolesView from '../views/RolesView.vue';

// Hash mode (architecture §2.3 / ADR-0006): no server-side history rewrite needed.
const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true },
  },
  { path: '/', name: 'root', redirect: '/projects' },
  {
    path: '/projects',
    name: 'projects',
    component: ProjectsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:projectId/flags',
    name: 'flags',
    component: FlagsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:projectId/flags/:flagKey',
    name: 'flag-editor',
    component: FlagEditorView,
    meta: { requiresAuth: true },
  },
  {
    path: '/projects/:projectId/access',
    name: 'project-access',
    component: ProjectAccessView,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/playground',
    name: 'playground',
    component: PlaygroundView,
    meta: { requiresAuth: true },
  },
  {
    path: '/api-keys',
    name: 'api-keys',
    component: ApiKeysView,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/audit',
    name: 'audit',
    component: AuditView,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/members',
    name: 'members',
    component: MembersView,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/roles',
    name: 'roles',
    component: RolesView,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/guide',
    name: 'guide',
    component: GuideView,
    meta: { requiresAuth: true },
  },
];

const router: Router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  // After a page reload the in-memory identity is gone but the cookie may still be valid (FR-40).
  await session.restore();
  if (to.meta.public) {
    if (session.isAuthenticated) return '/projects';
    return true;
  }
  if (!session.isAuthenticated) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  if (to.meta.adminOnly === true) {
    // Admin-only surfaces (API keys, audit, member management) require the global admin capability.
    if (!session.isAdmin) {
      return '/projects';
    }
  }
  return true;
});

export default router;
