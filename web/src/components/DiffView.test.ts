import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { NText } from 'naive-ui';
import DiffView from './DiffView.vue';

describe('DiffView (FR-57 audit / definition diff)', () => {
  it('renders the empty state when before equals after', () => {
    const wrapper = mount(DiffView, {
      props: {
        before: { enabled: true, variants: { on: true, off: false } },
        after: { enabled: true, variants: { on: true, off: false } },
      },
      global: { components: { NText } } as never,
    });

    expect(wrapper.text()).toContain('No differences.');
  });

  it('renders before/after values for a changed field', () => {
    const wrapper = mount(DiffView, {
      props: { before: { enabled: true }, after: { enabled: false } },
      global: { components: { NText } } as never,
    });

    expect(wrapper.text()).toContain('true');
    expect(wrapper.text()).toContain('false');
  });
});
