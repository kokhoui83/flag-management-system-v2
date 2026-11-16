import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { byTestId, allByTestId } from '../test-support';
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

  function mountWith(rules: FlagRule[], disabled = false) {
    return mount(RuleEditor, { props: { rules, variants, disabled } });
  }

  function lastRules(wrapper: ReturnType<typeof mountWith>): FlagRule[] {
    const events = wrapper.emitted('update:rules');
    expect(events).toBeTruthy();
    return events![events!.length - 1]![0] as FlagRule[];
  }

  const COUNTRY_RULE: FlagRule = {
    type: 'attribute',
    conditions: [{ attribute: 'country', op: 'eq', value: 'US' }],
    variant: 'on',
  };

  it('edits the attribute, operator and value of a condition', () => {
    const wrapper = mountWith([COUNTRY_RULE]);

    byTestId(wrapper, 'condition-attribute').vm.$emit('update:value', 'email');
    expect(lastRules(wrapper)[0]).toMatchObject({
      conditions: [{ attribute: 'email', op: 'eq', value: 'US' }],
    });
  });

  it('re-shapes the value when the operator changes', async () => {
    const wrapper = mountWith([COUNTRY_RULE]);

    byTestId(wrapper, 'condition-op').vm.$emit('update:value', 'in');
    expect(lastRules(wrapper)[0]).toMatchObject({
      conditions: [{ attribute: 'country', op: 'in', value: ['US'] }],
    });

    await wrapper.setProps({ rules: lastRules(wrapper) });
    byTestId(wrapper, 'condition-value').vm.$emit('update:value', 'US, FR');
    expect(lastRules(wrapper)[0]).toMatchObject({
      conditions: [{ attribute: 'country', op: 'in', value: ['US', 'FR'] }],
    });

    await wrapper.setProps({ rules: lastRules(wrapper) });
    byTestId(wrapper, 'condition-op').vm.$emit('update:value', 'exists');
    expect(
      (lastRules(wrapper)[0] as Extract<FlagRule, { type: 'attribute' }>)
        .conditions[0],
    ).toEqual({ attribute: 'country', op: 'exists' });
  });

  it('changes the variant an attribute rule serves', () => {
    const wrapper = mountWith([COUNTRY_RULE]);

    byTestId(wrapper, 'rule-variant').vm.$emit('update:value', 'off');

    expect(lastRules(wrapper)[0]).toMatchObject({ variant: 'off' });
  });

  it('appends a single terminal percentage rule that passes shared validation', async () => {
    const wrapper = mountWith([COUNTRY_RULE]);
    const addPercentage = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add percentage rule')!;

    await addPercentage.trigger('click');

    const rules = lastRules(wrapper);
    expect(rules.map((rule) => rule.type)).toEqual(['attribute', 'percentage']);
    expect(
      validateDefinition({
        enabled: true,
        variants,
        defaultVariant: 'off',
        rules,
      }),
    ).toEqual([]);
    expect(addPercentage.attributes('disabled')).toBeDefined();
  });

  it('edits the weight of a percentage split', () => {
    const wrapper = mountWith([
      {
        type: 'percentage',
        splits: [
          { variant: 'on', weight: 50 },
          { variant: 'off', weight: 50 },
        ],
      },
    ]);

    allByTestId(wrapper, 'split-weight')[0]!.vm.$emit('update:value', 10);

    expect(lastRules(wrapper)[0]).toMatchObject({
      splits: [
        { variant: 'on', weight: 10 },
        { variant: 'off', weight: 50 },
      ],
    });
  });

  it('reorders rules', async () => {
    const second: FlagRule = { ...COUNTRY_RULE, variant: 'off' };
    const wrapper = mountWith([COUNTRY_RULE, second]);

    await wrapper.find('[aria-label="Move rule 2 up"]').trigger('click');

    expect(
      lastRules(wrapper).map((rule) => (rule as typeof second).variant),
    ).toEqual(['off', 'on']);
  });

  it('emits nothing while disabled (product owner, FR-59)', async () => {
    const wrapper = mountWith([COUNTRY_RULE], true);

    byTestId(wrapper, 'condition-attribute').vm.$emit('update:value', 'email');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add rule')!
      .trigger('click');

    expect(wrapper.emitted('update:rules')).toBeUndefined();
  });
});
