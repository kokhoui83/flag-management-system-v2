import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  compileFlagdModel,
  compileTargeting,
  etagFor,
  stableStringify,
  FLAGD_FLAGS_SCHEMA,
  FLAGD_GENERATOR,
  type FlagdFlagInput,
} from './flagd-model';

function flag(overrides: Partial<FlagdFlagInput> = {}): FlagdFlagInput {
  return {
    key: 'new-checkout',
    enabled: true,
    variants: { on: true, off: false },
    defaultVariant: 'off',
    rules: [],
    version: 7,
    ...overrides,
  };
}

const GENERATED_AT = '2026-11-04T00:00:00Z';

describe('domain: flagd model compilation (roadmap M2)', () => {
  it('emits the flagd document shape with set-level metadata and flag-level version (03 §3.1)', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [flag()],
    });

    expect(doc.$schema).toBe(FLAGD_FLAGS_SCHEMA);
    expect(doc.metadata).toEqual({
      flagSetId: 'checkout:staging',
      generator: FLAGD_GENERATOR,
      generatedAt: GENERATED_AT,
    });
    expect(Object.keys(doc.flags)).toEqual(['new-checkout']);
    expect(doc.flags['new-checkout']).toEqual({
      state: 'ENABLED',
      variants: { on: true, off: false },
      defaultVariant: 'off',
      metadata: { version: 7 },
    });
  });

  it('marks disabled flags DISABLED (FR-10)', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [flag({ enabled: false })],
    });
    expect(doc.flags['new-checkout']?.state).toBe('DISABLED');
  });

  it('emits no targeting when the definition has no rules (STATIC)', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [flag({ rules: [] })],
    });
    expect(doc.flags['new-checkout']?.targeting).toBeUndefined();
  });

  it('compiles a single attribute rule to the golden if-expression', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [
        flag({
          rules: [
            {
              type: 'attribute',
              conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }],
              variant: 'on',
            },
          ],
        }),
      ],
    });
    expect(doc.flags['new-checkout']?.targeting).toEqual({
      if: [{ ends_with: [{ var: 'email' }, '@acme.com'] }, 'on', null],
    });
  });

  it('right-nests ifs for multiple attribute rules preserving first-match-wins order', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [
        flag({
          rules: [
            {
              type: 'attribute',
              conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }],
              variant: 'on',
            },
            {
              type: 'attribute',
              conditions: [{ attribute: 'plan', op: 'eq', value: 'enterprise' }],
              variant: 'off',
            },
            {
              type: 'attribute',
              conditions: [{ attribute: 'app', op: 'in', value: ['ios', 'android'] }],
              variant: 'on',
            },
          ],
        }),
      ],
    });
    expect(doc.flags['new-checkout']?.targeting).toEqual({
      if: [
        { ends_with: [{ var: 'email' }, '@acme.com'] },
        'on',
        {
          if: [
            { '===': [{ var: 'plan' }, 'enterprise'] },
            'off',
            { if: [{ in: [{ var: 'app' }, ['ios', 'android']] }, 'on', null] },
          ],
        },
      ],
    });
  });

  it('compiles an attribute rule followed by a terminal percentage rule to fractional without a bucketing expression', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [
        flag({
          rules: [
            {
              type: 'attribute',
              conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }],
              variant: 'on',
            },
            { type: 'percentage', splits: [{ variant: 'on', weight: 25 }, { variant: 'off', weight: 75 }] },
          ],
        }),
      ],
    });
    expect(doc.flags['new-checkout']?.targeting).toEqual({
      if: [
        { ends_with: [{ var: 'email' }, '@acme.com'] },
        'on',
        { fractional: [['on', 25], ['off', 75]] },
      ],
    });
  });

  it('serializes byte-stable documents (sorted keys, no whitespace) per state', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [flag()],
    });
    const body = stableStringify(doc);
    expect(body).toContain('"flagSetId":"checkout:staging"');
    expect(body).not.toContain('\n');
  });

  it('computes the state hash ETag excluding generatedAt (FR-26)', () => {
    const doc = compileFlagdModel({
      flagSetId: 'checkout:staging',
      generatedAt: GENERATED_AT,
      flags: [flag()],
    });
    const stateBody = stableStringify({ ...doc, metadata: { flagSetId: doc.metadata.flagSetId, generator: doc.metadata.generator } });
    expect(stateBody).not.toContain('generatedAt');
    expect(etagFor(stateBody)).toBe(`fms-${createHash('sha256').update(stateBody).digest('hex')}`);
  });

  it('produces equal ETags for equal state regardless of generatedAt', () => {
    const docA = compileFlagdModel({ flagSetId: 'checkout:staging', generatedAt: GENERATED_AT, flags: [flag()] });
    const docB = compileFlagdModel({ flagSetId: 'checkout:staging', generatedAt: '2026-11-05T00:00:00Z', flags: [flag()] });
    expect(
      etagFor(stableStringify({ ...docA, metadata: { flagSetId: docA.metadata.flagSetId, generator: docA.metadata.generator } })),
    ).toBe(
      etagFor(stableStringify({ ...docB, metadata: { flagSetId: docB.metadata.flagSetId, generator: docB.metadata.generator } })),
    );
  });
});

describe('domain: flagd targeting compilation (03 §3.2, ADR-0005)', () => {
  it('ANDs multiple conditions with the JsonLogic and operator', () => {
    const targeting = compileTargeting([
      {
        type: 'attribute',
        conditions: [
          { attribute: 'email', op: 'ends_with', value: '@acme.com' },
          { attribute: 'plan', op: 'eq', value: 'enterprise' },
        ],
        variant: 'on',
      },
    ]);
    expect(targeting).toEqual({
      if: [
        {
          and: [
            { ends_with: [{ var: 'email' }, '@acme.com'] },
            { '===': [{ var: 'plan' }, 'enterprise'] },
          ],
        },
        'on',
        null,
      ],
    });
  });
});
