import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RolesView from './RolesView.vue';

describe('RolesView (FR-54 capability matrix)', () => {
  it('renders the capability matrix with a scope and one cell per role', () => {
    const wrapper = mount(RolesView);

    const rows = wrapper.findAll('[data-testid="capability-matrix"] tbody tr');
    expect(rows).toHaveLength(11);
    const cells = (capability: string) =>
      rows
        .find((row) => row.find('th').text() === capability)!
        .findAll('td')
        .map((cell) => cell.text());

    expect(cells('Create projects')).toEqual([
      'global',
      '✓Allowed',
      '—Not allowed',
      '—Not allowed',
    ]);
    expect(cells('Delete flags')).toEqual([
      'project',
      '✓Allowed',
      '—Not allowed',
      '—Not allowed',
    ]);
    expect(cells("Toggle a flag's enabled state")).toEqual([
      'project',
      '✓Allowed',
      '✓Allowed',
      '✓Allowed',
    ]);
  });

  it('explains how global and project roles combine', () => {
    expect(mount(RolesView).text()).toContain(
      'Effective permission = global role ∪ per-project role',
    );
  });
});
