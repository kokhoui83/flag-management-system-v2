import { createRouter, createWebHashHistory } from 'vue-router';
import App from '../App.vue';

// Hash mode (architecture §2.3 / ADR-0006): no server-side history rewrite needed.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'root',
      component: App,
    },
  ],
});

export default router;
