import { createHash } from 'node:crypto';
import type { AttributeCondition, FlagRule, VariantValue } from '@fms/shared';

/**
 * flagd model compilation (roadmap M2; [03-data-model.md §3], ADR-0005).
 *
 * Pure function from validated FMS flag state to the flagd flag-set document
 * served at `GET /api/v1/sync/:projectKey/:env`. The compiler is total over
 * validated input and never throws for well-formed state (03 §3.4).
 */

export const FLAGD_FLAGS_SCHEMA = 'https://flagd.dev/schema/v0/flags.json';
export const FLAGD_GENERATOR = 'fms';

export interface FlagdFlagInput {
  key: string;
  enabled: boolean;
  variants: Record<string, VariantValue>;
  defaultVariant: string;
  rules: FlagRule[];
  version: number;
}

export type FlagdFlagState = 'ENABLED' | 'DISABLED';

export interface FlagdFlagEntry {
  state: FlagdFlagState;
  variants: Record<string, VariantValue>;
  defaultVariant: string;
  /** JsonLogic targeting expression; absent when the definition has no rules (STATIC). */
  targeting?: unknown;
  metadata: { version: number };
}

export interface FlagdModelMetadata {
  flagSetId: string;
  generator: string;
  generatedAt: string;
}

export interface FlagdModelDocument {
  $schema: string;
  metadata: FlagdModelMetadata;
  flags: Record<string, FlagdFlagEntry>;
}

export interface FlagdModelInput {
  /** Flag-set ID per the OQ-6 resolution: `<projectKey>:<env>` (ADR-0004). */
  flagSetId: string;
  generatedAt: string;
  flags: FlagdFlagInput[];
}

/** Emit one flag-set document from the (project, env) flag state (03 §3.1). */
export function compileFlagdModel(input: FlagdModelInput): FlagdModelDocument {
  const flags: Record<string, FlagdFlagEntry> = {};
  for (const flag of [...input.flags].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    flags[flag.key] = {
      state: flag.enabled ? 'ENABLED' : 'DISABLED',
      variants: flag.variants,
      defaultVariant: flag.defaultVariant,
      ...(flag.rules.length > 0 ? { targeting: compileTargeting(flag.rules) } : {}),
      metadata: { version: flag.version },
    };
  }
  return {
    $schema: FLAGD_FLAGS_SCHEMA,
    metadata: { flagSetId: input.flagSetId, generator: FLAGD_GENERATOR, generatedAt: input.generatedAt },
    flags,
  };
}

/** Condition → JsonLogic operation (03 §3.2 op mapping, strict — no coercion). */
function conditionToJsonLogic(condition: AttributeCondition): Record<string, unknown> {
  const attribute = condition.attribute;
  const value = condition.value;
  switch (condition.op) {
    case 'eq':
      return { '===': [{ var: attribute }, value] };
    case 'neq':
      return { '!==': [{ var: attribute }, value] };
    case 'in':
      return { in: [{ var: attribute }, value] };
    case 'starts_with':
      return { starts_with: [{ var: attribute }, value] };
    case 'ends_with':
      return { ends_with: [{ var: attribute }, value] };
    case 'gt':
      return { '>': [{ var: attribute }, value] };
    case 'gte':
      return { '>=': [{ var: attribute }, value] };
    case 'lt':
      return { '<': [{ var: attribute }, value] };
    case 'lte':
      return { '<=': [{ var: attribute }, value] };
    case 'exists':
      return { '!!': [{ var: attribute }] };
  }
}

function conditionsToExpression(conditions: AttributeCondition[]): unknown {
  if (conditions.length === 1) {
    return conditionToJsonLogic(conditions[0]!);
  }
  return { and: conditions.map((condition) => conditionToJsonLogic(condition)) };
}

/** Ordered rules → right-nested `if` chain; the terminal branch is `fractional` (percentage) or `null` (default). */
function compileChain(rules: FlagRule[]): unknown {
  const head = rules[0]!;
  if (head.type === 'percentage') {
    const splits = head.splits.map((split) => [split.variant, split.weight] as [string, number]);
    return { fractional: splits };
  }
  const condition = conditionsToExpression(head.conditions);
  const variant = head.variant;
  if (rules.length === 1) {
    return { if: [condition, variant, null] };
  }
  const elseBranch = compileChain(rules.slice(1));
  return { if: [condition, variant, elseBranch] };
}

/** Attribute/percentage rule list → flagd JsonLogic targeting (ADR-0005). */
export function compileTargeting(rules: FlagRule[]): unknown {
  if (rules.length === 0) {
    return undefined;
  }
  return compileChain(rules);
}

/** Stable serialization: sorted object keys, no whitespace (FR-28). */
export function stableStringify(value: unknown): string {
  const serialize = (v: unknown): string => {
    if (v === null || typeof v !== 'object') {
      return JSON.stringify(v) ?? 'null';
    }
    if (Array.isArray(v)) {
      return `[${v.map(serialize).join(',')}]`;
    }
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, val]) => `${JSON.stringify(k)}:${serialize(val)}`).join(',')}}`;
  };
  return serialize(value);
}

/** State-derived body: the serialized document with `metadata.generatedAt` excluded (FR-26). */
export function stateBodyOf(doc: FlagdModelDocument): string {
  const metadata: Omit<FlagdModelMetadata, 'generatedAt'> = { flagSetId: doc.metadata.flagSetId, generator: doc.metadata.generator };
  return stableStringify({ $schema: doc.$schema, metadata, flags: doc.flags });
}

/** ETag = `"fms-" + SHA-256 hex of the state-derived body` (FR-26). */
export function etagFor(body: string): string {
  return `fms-${createHash('sha256').update(body).digest('hex')}`;
}

/** Variant type per flag key, derived from the variant values (for the later evaluate proxy lookup). */
export function variantTypesOf(flags: FlagdFlagInput[]): Record<string, string> {
  const types: Record<string, string> = {};
  for (const flag of flags) {
    const firstValue = Object.values(flag.variants)[0];
    const type = typeof firstValue === 'boolean' ? 'boolean' : typeof firstValue === 'number' ? 'number' : 'string';
    types[flag.key] = type;
  }
  return types;
}
