import { describe, it, expect } from 'vitest';
import {
  nextFlagVersion,
  definitionsEqual,
  solelyEnabledChanged,
  productOwnerPutAllowed,
  type StoredFlagDefinition,
} from './flags';
import type { FlagDefinitionInput } from '@fms/shared';

function stored(
  overrides: Partial<StoredFlagDefinition> = {},
): StoredFlagDefinition & { updatedAt: Date } {
  return {
    enabled: false,
    variants: { on: true, off: false },
    defaultVariant: 'off',
    rules: [],
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('domain: flag version semantics (FR-5)', () => {
  it('starts at 1 on flag creation (first upsert bumps to 2)', () => {
    // flags.version starts at 1 on creation; first definition upsert -> +1.
    expect(nextFlagVersion(1, null, { enabled: true, variants: { on: true }, defaultVariant: 'on', rules: [] })).toBe(2);
  });

  it('bumps by exactly 1 on a changed definition update', () => {
    expect(nextFlagVersion(7, stored(), { enabled: true, variants: { on: true }, defaultVariant: 'on', rules: [] })).toBe(8);
  });

  it('is a no-op (same version) when the idempotent put matches stored state', () => {
    const incoming: FlagDefinitionInput = {
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      rules: [],
    };
    expect(nextFlagVersion(8, stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }), incoming)).toBe(8);
  });

  it('bumps per environment change only for the changed definition', () => {
    // dev toggled (true -> false) bumps the flag version; the next env toggle bumps independently.
    expect(nextFlagVersion(8, stored({ enabled: true }), { enabled: false, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] })).toBe(9);
  });
});

describe('domain: definition equality (idempotency)', () => {
  it('treats equal inputs as unchanged', () => {
    expect(
      definitionsEqual(
        stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }),
        { enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
      ),
    ).toBe(true);
  });

  it('treats differing rules as changed', () => {
    expect(
      definitionsEqual(
        stored({ rules: [] }),
        { enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [{ type: 'attribute', conditions: [], variant: 'on' }] },
      ),
    ).toBe(false);
  });
});

describe('domain: product-owner definition policy (FR-59)', () => {
  it('allows an enabled-only change for a product owner', () => {
    expect(
      solelyEnabledChanged(
        stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }),
        { enabled: false, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
      ),
    ).toBe(true);
  });

  it('rejects a variant change for a product owner', () => {
    expect(
      solelyEnabledChanged(
        stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }),
        { enabled: true, variants: { on: true, off: 'nope' }, defaultVariant: 'off', rules: [] },
      ),
    ).toBe(false);
  });

  it('rejects a rule change for a product owner', () => {
    expect(
      solelyEnabledChanged(
        stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }),
        {
          enabled: true,
          variants: { on: true, off: false },
          defaultVariant: 'off',
          rules: [{ type: 'attribute', conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }], variant: 'on' }],
        },
      ),
    ).toBe(false);
  });

  it('rejects a default-variant change for a product owner', () => {
    expect(
      solelyEnabledChanged(
        stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }),
        { enabled: true, variants: { on: true, off: false }, defaultVariant: 'on', rules: [] },
      ),
    ).toBe(false);
  });

  it('accepts an identical put as an allowed (idempotent) product-owner update', () => {
    expect(
      productOwnerPutAllowed(
        stored({ enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] }),
        { enabled: true, variants: { on: true, off: false }, defaultVariant: 'off', rules: [] },
      ),
    ).toBe(true);
  });

  it('rejects creating a definition for a product owner (no stored definition)', () => {
    expect(productOwnerPutAllowed(undefined, { enabled: true, variants: { on: true }, defaultVariant: 'on', rules: [] })).toBe(false);
  });
});
