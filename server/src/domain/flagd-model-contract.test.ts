import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import { compileFlagdModel, type FlagdFlagInput } from './flagd-model';

const flagsSchemaPath = path.resolve(process.cwd(), 'test/fixtures/schema/flags.json');
const targetingSchemaPath = path.resolve(process.cwd(), 'test/fixtures/schema/targeting.json');

function compileDoc(rules: FlagdFlagInput['rules'], enabled = true): ReturnType<typeof compileFlagdModel> {
  return compileFlagdModel({
    flagSetId: 'checkout:staging',
    generatedAt: '2026-11-04T00:00:00Z',
    flags: [
      {
        key: 'new-checkout',
        enabled,
        variants: { on: true, off: false },
        defaultVariant: 'off',
        rules,
        version: 7,
      },
    ],
  });
}

describe('contract: compiled flagd models validate against the official flagd schema (NFR-9)', () => {
  it('exposes the vendored official flagd JSON schema', () => {
    const flagsSchema = JSON.parse(readFileSync(flagsSchemaPath, 'utf8')) as { $id: string };
    expect(flagsSchema.$id).toBe('https://flagd.dev/schema/v0/flags.json');
  });

  it('accepts a static (no-rules) ENABLED boolean flag document', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.addSchema(JSON.parse(readFileSync(targetingSchemaPath, 'utf8')), 'https://flagd.dev/schema/v0/targeting.json');
    const validate = ajv.compile(JSON.parse(readFileSync(flagsSchemaPath, 'utf8')));
    const doc = compileDoc([]);
    expect(validate(doc)).toBe(true);
    if (!validate(doc)) {
      console.error(validate.errors);
    }
  });

  it('accepts an attribute + terminal fractional flag document', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.addSchema(JSON.parse(readFileSync(targetingSchemaPath, 'utf8')), 'https://flagd.dev/schema/v0/targeting.json');
    const validate = ajv.compile(JSON.parse(readFileSync(flagsSchemaPath, 'utf8')));
    const doc = compileDoc([
      {
        type: 'attribute',
        conditions: [{ attribute: 'email', op: 'ends_with', value: '@acme.com' }],
        variant: 'on',
      },
      { type: 'percentage', splits: [{ variant: 'on', weight: 25 }, { variant: 'off', weight: 75 }] },
    ]);
    expect(validate(doc)).toBe(true);
    if (!validate(doc)) {
      console.error(validate.errors);
    }
  });

  it('accepts a DISABLED flag document', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.addSchema(JSON.parse(readFileSync(targetingSchemaPath, 'utf8')), 'https://flagd.dev/schema/v0/targeting.json');
    const validate = ajv.compile(JSON.parse(readFileSync(flagsSchemaPath, 'utf8')));
    const doc = compileDoc([], false);
    expect(validate(doc)).toBe(true);
    if (!validate(doc)) {
      console.error(validate.errors);
    }
  });
});
