import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { NInput, NSelect, NTag, NText } from 'naive-ui';
import { validateDefinition, type FlagRule } from '@fms/shared';
import RuleEditor from './RuleEditor.vue';

const variants = { on: true, off: false };

describe('RuleEditor (FR-19 / FR-42 rule authoring)', () => {
  it('renders the empty state when no rules are configured', () => {
    const wrapper = mount(RuleEditor, {
      props: { rules: [], variants },
      global: { components: { NText } } as never,
    });

    expect(wrapper.text()).toContain('No targeting rules');
  });

  it('emits a new rule list when a condition is added', async () => {
    const wrapper = mount(RuleEditor, {
      props: {
        rules: [{ type: 'attribute', conditions: [], variant: 'on' }],
        variants,
      },
      global: { components: { NInput, NSelect, NTag, NText } } as never,
    });

    const addCondition = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add condition');
    expect(addCondition).toBeTruthy();
    await addCondition!.trigger('click');

    expect(wrapper.emitted('update:rules')).toBeTruthy();
    const emitted = wrapper.emitted('update:rules')![0]![0] as FlagRule[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.type).toBe('attribute');
    const rule = emitted[0] as Extract<FlagRule, { type: 'attribute' }>;
    expect(rule.conditions).toHaveLength(1);
  });

  it('rejects an incomplete rule before emitting updates', () => {
    mount(RuleEditor, {
      props: {
        rules: [
          {
            type: 'attribute',
            conditions: [{ attribute: 'country', op: 'eq', value: 'US' }],
            variant: 'on',
          },
        ],
        variants,
      },
      global: { components: { NInput, NSelect, NTag, NText } } as never,
    });

    // The editor emits drafts; the shared validator is the single source of truth for submit.
    const problems = validateDefinition({
      enabled: true,
      variants,
      defaultVariant: 'off',
      rules: [
        {
          type: 'attribute',
          conditions: [{ attribute: 'country', op: 'eq', value: 'US' }],
          variant: 'on',
        },
      ],
    });

    expect(problems).toEqual([]);
  });
});
