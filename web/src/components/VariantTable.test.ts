import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { byTestId, allByTestId } from '../test-support';
import { NInput } from 'naive-ui';
import type { VariantValue } from '@fms/shared';
import VariantTable from './VariantTable.vue';

type Variants = Record<string, VariantValue>;

function mountTable(variants: Variants, disabled = false) {
  return mount(VariantTable, { props: { variants, disabled } });
}

function lastEmitted(wrapper: ReturnType<typeof mountTable>): Variants {
  const events = wrapper.emitted('update:variants');
  expect(events).toBeTruthy();
  return events![events!.length - 1]![0] as Variants;
}

function buttonNamed(wrapper: ReturnType<typeof mountTable>, name: string) {
  const button = wrapper
    .findAll('button')
    .find((candidate) => candidate.text() === name);
  expect(button).toBeTruthy();
  return button!;
}

describe('VariantTable (FR-42 variant table: name, value, type)', () => {
  it('lists each variant with its name and the shared value type', () => {
    const wrapper = mountTable({ on: true, off: false });

    const names = wrapper
      .findAll('[data-testid="variant-name"] input')
      .map((input) => (input.element as HTMLInputElement).value);
    expect(names).toEqual(['on', 'off']);
    expect(byTestId(wrapper, 'variant-type').props('value')).toBe('boolean');
  });

  it('adds a variant with a unique name and a value of the current type', async () => {
    const wrapper = mountTable({ on: true, off: false });

    await buttonNamed(wrapper, 'Add variant').trigger('click');

    expect(lastEmitted(wrapper)).toEqual({
      on: true,
      off: false,
      'variant-3': false,
    });
  });

  it('removes a variant', async () => {
    const wrapper = mountTable({ on: true, off: false, beta: true });

    await wrapper
      .findAll('[data-testid="variant-remove"]')[2]!
      .trigger('click');

    expect(lastEmitted(wrapper)).toEqual({ on: true, off: false });
  });

  it('renames a variant in place, keeping the order and value', async () => {
    const wrapper = mountTable({ on: true, off: false });

    wrapper
      .findAllComponents(NInput)
      .find((input) => input.props('value') === 'off')!
      .vm.$emit('update:value', 'disabled');

    expect(Object.entries(lastEmitted(wrapper))).toEqual([
      ['on', true],
      ['disabled', false],
    ]);
  });

  it('refuses a rename that would collide with another variant', async () => {
    const wrapper = mountTable({ on: true, off: false });

    wrapper
      .findAllComponents(NInput)
      .find((input) => input.props('value') === 'off')!
      .vm.$emit('update:value', 'on');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:variants')).toBeUndefined();
    expect(wrapper.text()).toContain("Variant name 'on' is already used");
  });

  it('keeps typed values when editing a number variant', async () => {
    const wrapper = mountTable({ small: 1, large: 10 });

    allByTestId(wrapper, 'variant-value')[1]!.vm.$emit('update:value', 25);

    expect(lastEmitted(wrapper)).toEqual({ small: 1, large: 25 });
  });

  it('converts every value when the variant type changes', async () => {
    const wrapper = mountTable({ on: true, off: false });

    byTestId(wrapper, 'variant-type').vm.$emit('update:value', 'string');

    expect(lastEmitted(wrapper)).toEqual({ on: 'true', off: 'false' });
  });

  it('is read-only when disabled (product owner, FR-59)', () => {
    const wrapper = mountTable({ on: true, off: false }, true);

    expect(
      wrapper
        .findAll('[data-testid="variant-name"] input')
        .every((input) => (input.element as HTMLInputElement).disabled),
    ).toBe(true);
    expect(
      buttonNamed(wrapper, 'Add variant').attributes('disabled'),
    ).toBeDefined();
  });
});
