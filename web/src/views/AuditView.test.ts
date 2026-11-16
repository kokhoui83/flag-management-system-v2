import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { api } from '../api/client';
import type { AuditEntry } from '../api/types';
import AuditView from './AuditView.vue';

vi.mock('../api/client', () => ({
  api: { listAudit: vi.fn() },
  ApiError: class ApiError extends Error {},
}));

function entry(id: string, overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id,
    createdAt: '2026-11-07T00:00:00.000Z',
    actorType: 'session',
    actorName: 'admin',
    action: 'definition.update',
    entity: 'flag',
    entityId: 'alpha',
    env: 'staging',
    before: { enabled: true },
    after: { enabled: false },
    ...overrides,
  };
}

function fullPage(prefix: string): AuditEntry[] {
  return Array.from({ length: 50 }, (_, index) => entry(`${prefix}-${index}`));
}

describe('AuditView (FR-46 audit view)', () => {
  beforeEach(() => {
    vi.mocked(api.listAudit).mockReset();
  });

  it('lists time, actor, action, entity and environment', async () => {
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: [entry('a-1')],
      nextBefore: 'a-1',
    });

    const wrapper = mount(AuditView);
    await flushPromises();

    const row = wrapper.find('[data-testid="audit-row"]').text();
    expect(row).toContain('admin');
    expect(row).toContain('definition.update');
    expect(row).toContain('alpha');
    expect(row).toContain('staging');
  });

  it('expands a row into its before/after diff', async () => {
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: [entry('a-1')],
      nextBefore: 'a-1',
    });
    const wrapper = mount(AuditView);
    await flushPromises();
    expect(wrapper.find('[data-testid="audit-diff"]').exists()).toBe(false);

    await wrapper.find('[data-testid="audit-diff-toggle"]').trigger('click');

    const diff = wrapper.find('[data-testid="audit-diff"]').text();
    expect(diff).toContain('enabled');
    expect(diff).toContain('before: true');
    expect(diff).toContain('after: false');
  });

  it('offers no diff for entries whose recorded state is empty', async () => {
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: [entry('a-1', { action: 'auth.login', before: {}, after: {} })],
      nextBefore: null,
    });

    const wrapper = mount(AuditView);
    await flushPromises();

    expect(wrapper.find('[data-testid="audit-diff-toggle"]').exists()).toBe(
      false,
    );
  });

  it('offers no diff for entries without before/after state', async () => {
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: [
        entry('a-1', { action: 'auth.login', before: null, after: null }),
      ],
      nextBefore: 'a-1',
    });

    const wrapper = mount(AuditView);
    await flushPromises();

    expect(wrapper.find('[data-testid="audit-diff-toggle"]').exists()).toBe(
      false,
    );
  });

  it('keeps the applied filters when loading older entries', async () => {
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: [],
      nextBefore: null,
    });
    const wrapper = mount(AuditView);
    await flushPromises();
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: fullPage('new'),
      nextBefore: 'new-49',
    });
    await wrapper
      .find('[data-testid="audit-action-filter"] input')
      .setValue('definition.update');
    await wrapper
      .find('[data-testid="audit-actor-filter"] input')
      .setValue('admin');
    await wrapper.find('form.audit-filters').trigger('submit');
    await flushPromises();
    vi.mocked(api.listAudit).mockResolvedValue({
      entries: [entry('old-1')],
      nextBefore: null,
    });

    await wrapper.find('[data-testid="audit-older"]').trigger('click');
    await flushPromises();

    expect(api.listAudit).toHaveBeenLastCalledWith({
      actor: 'admin',
      action: 'definition.update',
      entity: null,
      before: 'new-49',
      limit: 50,
    });
    expect(wrapper.findAll('[data-testid="audit-row"]')).toHaveLength(51);
    expect(
      wrapper.find('[data-testid="audit-older"]').attributes('disabled'),
    ).toBeDefined();
    expect(wrapper.find('[data-testid="audit-count"]').text()).toContain(
      '51 entries shown — end of the log',
    );
  });

  it('reports a load failure', async () => {
    vi.mocked(api.listAudit).mockRejectedValue(
      new Error('Admin capability required'),
    );

    const wrapper = mount(AuditView);
    await flushPromises();

    expect(wrapper.find('[data-testid="audit-error"]').text()).toContain(
      'Admin capability required',
    );
  });
});
