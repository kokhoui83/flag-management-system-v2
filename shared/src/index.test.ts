import { describe, it, expect } from 'vitest';
import {
  FLAG_KEY_PATTERN,
  VARIANT_NAME_PATTERN,
  ATTRIBUTE_OPS,
  validateFlagKey,
  validateDefinition,
  type FlagDefinitionInput,
} from './index';

describe('shared: flag key validation (FR-1)', () => {
  it('accepts a well-formed key', () => {
    expect(validateFlagKey('new-checkout_v2')).toEqual([]);
  });

  it('accepts a single-letter key', () => {
    expect(validateFlagKey('a')).toEqual([]);
  });

  it('rejects keys with dots, spaces or leading digits', () => {
    expect(validateFlagKey('9bad!')).toHaveLength(1);
    expect(validateFlagKey('bad key')).toHaveLength(1);
    expect(validateFlagKey('has.dot')).toHaveLength(1);
  });

  it('rejects keys longer than 128 chars', () => {
    expect(validateFlagKey('a'.repeat(129))).toHaveLength(1);
  });

  it('exposes the compiled pattern', () => {
    expect(FLAG_KEY_PATTERN.source).toBe('^[a-zA-Z][a-zA-Z0-9-_]{0,127}$');
  });
});

describe('shared: variant names (FR-11/FR-16/FR-12)', () => {
  it('accepts names within the pattern and not reserved', () => {
    expect(VARIANT_NAME_PATTERN.test('on')).toBe(true);
    expect(VARIANT_NAME_PATTERN.test('v2_beta')).toBe(true);
  });

  it('exposes the compiled pattern', () => {
    expect(VARIANT_NAME_PATTERN.source).toBe('^[a-zA-Z][a-zA-Z0-9-_]{0,63}$');
  });

  it('rejects reserved variant names and malformed names', () => {
    const reserved = validateDefinition({
      enabled: true,
      variants: { true: true, off: false },
      defaultVariant: 'off',
      rules: [],
    });
    expect(reserved.some((p) => p.pointer === '/variants/true' && /reserved/i.test(p.message))).toBe(true);

    const malformed = validateDefinition({
      enabled: true,
      variants: { '9x': true },
      defaultVariant: 'true',
      rules: [],
    });
    expect(malformed.some((p) => p.pointer === '/variants/9x')).toBe(true);
  });
});

describe('shared: definition validation — all-at-once (FR-14)', () => {
  const valid: FlagDefinitionInput = {
    enabled: true,
    variants: { on: true, off: false },
    defaultVariant: 'off',
    rules: [],
  };

  it('accepts a valid definition', () => {
    expect(validateDefinition(valid)).toEqual([]);
  });

  it('rejects mixed JSON types across variants listing every problem', () => {
    const problems = validateDefinition({
      enabled: true,
      variants: { a: 1, b: 2, c: true },
      defaultVariant: 'off',
      rules: [],
    });

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.some((p) => p.pointer === '/variants/c')).toBe(true);
  });

  it('rejects an empty variants map', () => {
    const problems = validateDefinition({ ...valid, variants: {} });

    expect(problems.some((p) => p.pointer === '/variants')).toBe(true);
  });

  it('rejects a defaultVariant that is not a known variant', () => {
    expect(validateDefinition({ ...valid, defaultVariant: 'maybe' })).toEqual([
      expect.objectContaining({ pointer: '/defaultVariant' }),
    ]);
  });

  it('reports every problem at once (not fail-on-first)', () => {
    const problems = validateDefinition({
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'nope',
      rules: [
        {
          type: 'attribute',
          conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }],
          variant: 'yes', // FR-16: unknown variant
        },
      ],
    });

    expect(problems.some((p) => p.pointer === '/defaultVariant')).toBe(true);
    expect(problems.some((p) => p.pointer === '/rules/0/variant')).toBe(true);
  });
});

describe('shared: attribute rules (FR-15–FR-16)', () => {
  const variants = { on: true, off: false };

  it('accepts a well-formed attribute rule', () => {
    expect(
      validateDefinition({
        enabled: true,
        variants,
        defaultVariant: 'off',
        rules: [
          { type: 'attribute', conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }], variant: 'on' },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects an invalid op with the pointer at the condition', () => {
    const problems = validateDefinition({
      enabled: true,
      variants,
      defaultVariant: 'off',
      rules: [
        { type: 'attribute', conditions: [{ attribute: 'email', op: 'regex', value: 'x' }], variant: 'on' },
      ],
    });

    expect(problems.some((p) => p.pointer.startsWith('/rules/0/conditions/0'))).toBe(true);
    expect(ATTRIBUTE_OPS).toContain('eq');
  });

  it('rejects a numeric op applied to a string value (FR-15)', () => {
    const problems = validateDefinition({
      enabled: true,
      variants,
      defaultVariant: 'off',
      rules: [
        { type: 'attribute', conditions: [{ attribute: 'plan', op: 'gt', value: 'pro' }], variant: 'on' },
      ],
    });

    expect(problems.some((p) => p.pointer === '/rules/0/conditions/0/value')).toBe(true);
  });
});

describe('shared: percentage rules (FR-17–FR-18)', () => {
  it('accepts a single percentage rule that is last', () => {
    expect(
      validateDefinition({
        enabled: true,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules: [
          { type: 'attribute', conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }], variant: 'on' },
          { type: 'percentage', splits: [{ variant: 'on', weight: 25 }, { variant: 'off', weight: 75 }] },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects a percentage rule that is not last (FR-18)', () => {
    const problems = validateDefinition({
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      rules: [
        { type: 'percentage', splits: [{ variant: 'on', weight: 50 }] },
        { type: 'attribute', conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }], variant: 'on' },
      ],
    });

    expect(problems.some((p) => /last/i.test(p.message))).toBe(true);
  });

  it('rejects two percentage rules (FR-18)', () => {
    const problems = validateDefinition({
      enabled: true,
      variants: { on: true, off: false },
      defaultVariant: 'off',
      rules: [
        { type: 'percentage', splits: [{ variant: 'on', weight: 50 }] },
        { type: 'percentage', splits: [{ variant: 'off', weight: 50 }] },
      ],
    });

    expect(problems.length).toBeGreaterThan(0);
  });
});
