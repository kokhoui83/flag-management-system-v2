import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { api } from '../api/client';
import type { ApiKeyRecord } from '../api/types';
import ApiKeysView from './ApiKeysView.vue';

vi.mock('../api/client', () => ({
  api: { listApiKeys: vi.fn(), createApiKey: vi.fn(), revokeApiKey: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

const STORED: ApiKeyRecord = {
  id: 'key-1',
  name: 'billing-service',
  prefix: 'fms_abcd',
  scope: 'EVALUATE',
  createdAt: '2026-11-07T00:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
};

const dialogStub = {
  props: ['show', 'title'],
  template: '<section v-if="show" data-testid="dialog"><slot /></section>',
};

function mountKeys() {
  return mount(ApiKeysView, { global: { stubs: { AppDialog: dialogStub } } });
}

describe('ApiKeysView (FR-45 API key management)', () => {
  beforeEach(() => {
    for (const mock of Object.values(api)) vi.mocked(mock).mockReset();
  });

  it('lists keys with name, scope, last use and status', async () => {
    vi.mocked(api.listApiKeys).mockResolvedValue({
      keys: [
        STORED,
        {
          ...STORED,
          id: 'key-2',
          name: 'old',
          revokedAt: '2026-11-08T00:00:00.000Z',
        },
      ],
    });

    const wrapper = mountKeys();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows[0]!.text()).toContain('billing-service');
    expect(rows[0]!.text()).toContain('evaluate');
    expect(rows[0]!.text()).toContain('never');
    expect(rows[0]!.find('[data-testid="api-key-status"]').text()).toBe(
      'Active',
    );
    expect(rows[1]!.find('[data-testid="api-key-status"]').text()).toBe(
      'Revoked',
    );
    expect(rows[1]!.findAll('button')).toHaveLength(0);
  });

  it('keeps the one-time plaintext visible after the list reloads, until dismissed', async () => {
    vi.mocked(api.listApiKeys).mockResolvedValue({ keys: [] });
    vi.mocked(api.createApiKey).mockResolvedValue({
      id: 'key-1',
      name: 'billing-service',
      scope: 'evaluate',
      key: 'fms_plaintextSecret',
      createdAt: '2026-11-07T00:00:00.000Z',
    });
    const wrapper = mountKeys();
    await flushPromises();

    await wrapper.find('[data-testid="api-key-new"]').trigger('click');
    await wrapper
      .find('[data-testid="api-key-name"] input')
      .setValue('billing-service');
    vi.mocked(api.listApiKeys).mockResolvedValue({ keys: [STORED] });
    await wrapper.find('form.create-form').trigger('submit');
    await flushPromises();

    expect(api.createApiKey).toHaveBeenCalledWith(
      'billing-service',
      'evaluate',
    );
    expect(api.listApiKeys).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="api-key-plaintext"]').text()).toBe(
      'fms_plaintextSecret',
    );

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'I have copied the key')!
      .trigger('click');
    expect(wrapper.find('[data-testid="api-key-plaintext"]').exists()).toBe(
      false,
    );
  });

  it('requires a name before creating a key', async () => {
    vi.mocked(api.listApiKeys).mockResolvedValue({ keys: [] });
    const wrapper = mountKeys();
    await flushPromises();

    await wrapper.find('[data-testid="api-key-new"]').trigger('click');
    await wrapper.find('form.create-form').trigger('submit');
    await flushPromises();

    expect(api.createApiKey).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('A key name is required');
  });

  it('shows a load failure instead of an empty list', async () => {
    vi.mocked(api.listApiKeys).mockRejectedValue(
      new Error('Admin capability required'),
    );

    const wrapper = mountKeys();
    await flushPromises();

    expect(wrapper.text()).toContain('Admin capability required');
    expect(wrapper.text()).not.toContain('No API keys yet');
  });

  it('never re-shows a previous plaintext when the dialog is opened again', async () => {
    vi.mocked(api.listApiKeys).mockResolvedValue({ keys: [] });
    vi.mocked(api.createApiKey).mockResolvedValue({
      id: 'key-1',
      name: 'billing-service',
      scope: 'evaluate',
      key: 'fms_plaintextSecret',
      createdAt: '2026-11-07T00:00:00.000Z',
    });
    const wrapper = mountKeys();
    await flushPromises();
    await wrapper.find('[data-testid="api-key-new"]').trigger('click');
    await wrapper
      .find('[data-testid="api-key-name"] input')
      .setValue('billing-service');
    await wrapper.find('form.create-form').trigger('submit');
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'I have copied the key')!
      .trigger('click');

    await wrapper.find('[data-testid="api-key-new"]').trigger('click');

    expect(wrapper.find('[data-testid="api-key-plaintext"]').exists()).toBe(
      false,
    );
    expect(wrapper.find('form.create-form').exists()).toBe(true);
  });
});
