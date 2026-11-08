import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { NButton, NCard, NEmpty, NPageHeader, NSpin, NTag } from 'naive-ui';
import { api } from '../api/client';
import { useFlagsStore } from '../stores/flags';
import { useSessionStore } from '../stores/session';
import SyncHealthBadge from '../components/SyncHealthBadge.vue';
import FlagsView from './FlagsView.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { projectId: 'proj-1' }, name: 'flags' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../api/client', () => ({
  api: {
    listFlags: vi.fn(),
    getFlag: vi.fn(),
    listObserved: vi.fn(),
    putDefinition: vi.fn(),
    copyDefinition: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));

const PROJECT_ID = 'proj-1';

describe('FlagsView (FR-41 flag list)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(api.listFlags).mockReset();
    const session = useSessionStore();
    session.$patch({
      token: 'tok',
      username: 'admin',
      globalRole: 'admin',
      isBootstrapAdmin: true,
      assignments: [],
      projects: [
        {
          id: PROJECT_ID,
          key: 'acme',
          name: 'Acme',
          environments: ['staging'],
          members: [],
        },
      ],
      selectedProjectId: PROJECT_ID,
    });
    const flags = useFlagsStore();
    flags.$patch({
      projectId: PROJECT_ID,
      flags: [],
      detail: null,
      detailKey: null,
      observed: {},
    });
  });

  it('does not render the empty state while the flag list is loading', () => {
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    const wrapper = mount(FlagsView, {
      global: {
        components: {
          SyncHealthBadge,
          NButton,
          NCard,
          NEmpty,
          NPageHeader,
          NSpin,
          NTag,
        },
      } as never,
    });

    expect(wrapper.findComponent(NEmpty).exists()).toBe(false);
  });

  it('renders the empty state after the initial load settles with no flags', async () => {
    vi.mocked(api.listFlags).mockResolvedValue({ flags: [] });
    const wrapper = mount(FlagsView, {
      global: {
        components: {
          SyncHealthBadge,
          NButton,
          NCard,
          NEmpty,
          NPageHeader,
          NSpin,
          NTag,
        },
      } as never,
    });
    await flushPromises();

    expect(wrapper.findComponent(NEmpty).exists()).toBe(true);
  });
});
