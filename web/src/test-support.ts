import type { VueWrapper } from '@vue/test-utils';
import type { ComponentPublicInstance } from 'vue';

/** A mounted component whose props are read by name in assertions. */
type AnyComponent = VueWrapper<
  ComponentPublicInstance<Record<string, unknown>>
>;

/**
 * Component-test helpers: resolve Naive UI components by their `data-testid` so tests can read
 * props and emit `update:value` without depending on the components' internal DOM.
 */
export function byTestId(wrapper: VueWrapper, testId: string): AnyComponent {
  return wrapper.findComponent(
    `[data-testid="${testId}"]`,
  ) as unknown as AnyComponent;
}

export function allByTestId(
  wrapper: VueWrapper,
  testId: string,
): AnyComponent[] {
  return wrapper.findAllComponents(
    `[data-testid="${testId}"]`,
  ) as unknown as AnyComponent[];
}
