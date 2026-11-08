// @fms/shared — canonical rule types and all-at-once validation (ADR-0006).

export const FLAG_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9-_]{0,127}$/;
export const VARIANT_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9-_]{0,63}$/;
export const ENV_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
export const RESERVED_VARIANT_NAMES: readonly string[] = [
  'true',
  'false',
  'null',
];

/**
 * Multi-user capability levels (FR-54 / docs/01-requirements.md §4.9.1). The dashboard imports
 * this same vocabulary from `@fms/shared` to gate its surfaces; the management API re-exports it
 * from its domain module, so the union semantics exist in exactly one place.
 */
export const ROLES = ['admin', 'developer', 'product-owner'] as const;
export type Role = (typeof ROLES)[number];

/** Effective per-project capability of a caller; `null` = no access to the project. */
export type EffectiveRole = 'admin' | 'developer' | 'product-owner';

/** API key scopes accepted by the management API (FR-32 / FR-33). */
export const API_KEY_SCOPES = ['manage', 'evaluate', 'sync', 'all'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** Capability ladder, weakest → strongest (the FR-54 union collapses to the stronger grant). */
const CAPABILITY_LADDER: readonly EffectiveRole[] = [
  'product-owner',
  'developer',
  'admin',
];

function rankOf(role: string | null | undefined): number {
  const normalized = (role ?? '').trim().toLowerCase().replace(/_/g, '-');
  const index =
    normalized === ''
      ? -1
      : CAPABILITY_LADDER.indexOf(normalized as EffectiveRole);
  return index;
}

/**
 * Effective capability of a caller for one project: the union of the global role and the
 * per-project membership role (FR-54). A membership may elevate a caller on that project but
 * never reduce the global role; a caller holding neither has no access (`null`).
 */
export function effectiveCapability(
  globalRole: string | null | undefined,
  membershipRole: string | null | undefined,
): EffectiveRole | null {
  const globalRank = rankOf(globalRole);
  const membershipRank = rankOf(membershipRole);
  if (globalRank === CAPABILITY_LADDER.indexOf('admin')) return 'admin';
  if (membershipRank < 0) return null;
  return CAPABILITY_LADDER[
    Math.max(globalRank, membershipRank)
  ] as EffectiveRole;
}

/** The caller holds any role that may act on a project they are assigned to. */
export function hasProjectAccess(role: EffectiveRole | null): boolean {
  return role !== null;
}

/** The caller holds full (admin) capability on the project. */
export function isFullAccess(role: EffectiveRole | null): boolean {
  return role === 'admin';
}

export const ATTRIBUTE_OPS = [
  'eq',
  'neq',
  'in',
  'starts_with',
  'ends_with',
  'gt',
  'gte',
  'lt',
  'lte',
  'exists',
] as const;
export type AttributeOp = (typeof ATTRIBUTE_OPS)[number];

export type VariantType = 'boolean' | 'number' | 'string';
export type VariantValue = boolean | number | string;

export interface ValidationProblem {
  pointer: string;
  message: string;
}

export interface AttributeCondition {
  attribute: string;
  op: AttributeOp;
  value?: VariantValue | VariantValue[];
}

export interface AttributeRule {
  type: 'attribute';
  conditions: AttributeCondition[];
  variant: string;
}

export interface PercentageSplit {
  variant: string;
  weight: number;
}

export interface PercentageRule {
  type: 'percentage';
  splits: PercentageSplit[];
}

export type FlagRule = AttributeRule | PercentageRule;

export interface FlagDefinitionInput {
  enabled: boolean;
  variants: Record<string, VariantValue>;
  defaultVariant: string;
  rules: FlagRule[];
}

const MAX_VARIANT_VALUE_TYPE_LENGTH = 64;

function isVariantValue(v: unknown): v is VariantValue {
  return (
    typeof v === 'boolean' || typeof v === 'number' || typeof v === 'string'
  );
}

function variantTypeOf(value: VariantValue): VariantType | null {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  return null;
}

/**
 * FR-11: JSON type of a variant map (boolean | number | string). All values of one flag
 * share a single type; the first variant decides (validation guarantees homogeneity).
 */
export function variantTypeOfVariants(
  variants: Record<string, VariantValue>,
): VariantType {
  return variantTypeOf(Object.values(variants)[0] as VariantValue) ?? 'boolean';
}

/** FR-1: flag key pattern `^[a-zA-Z][a-zA-Z0-9-_]{0,127}$`. */
export function validateFlagKey(key: unknown): ValidationProblem[] {
  if (typeof key !== 'string') {
    return [{ pointer: '/key', message: 'key must be a string' }];
  }
  if (!FLAG_KEY_PATTERN.test(key)) {
    return [
      {
        pointer: '/key',
        message:
          'key must match ^[a-zA-Z][a-zA-Z0-9-_]{0,127}$ (letters, digits, -, _, no leading digit/dot/space)',
      },
    ];
  }
  return [];
}

/** FR-55: additional per-project environment names. */
export function validateEnvName(env: unknown): ValidationProblem[] {
  if (typeof env !== 'string' || !ENV_PATTERN.test(env)) {
    return [
      {
        pointer: '/env',
        message: 'env must match ^[a-z][a-z0-9-]{0,63}$ (lowercase, digits, -)',
      },
    ];
  }
  return [];
}

function validateVariantNames(
  variants: Record<string, VariantValue>,
): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  for (const name of Object.keys(variants)) {
    if (!VARIANT_NAME_PATTERN.test(name)) {
      problems.push({
        pointer: `/variants/${name}`,
        message: `variant name '${name}' must match ^[a-zA-Z][a-zA-Z0-9-_]{0,63}$`,
      });
    }
    if ((RESERVED_VARIANT_NAMES as readonly string[]).includes(name)) {
      problems.push({
        pointer: `/variants/${name}`,
        message: `variant name '${name}' is reserved`,
      });
    }
  }
  return problems;
}

function validateVariantValues(
  variants: Record<string, VariantValue>,
): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  const names = Object.keys(variants);
  if (names.length === 0) {
    return [
      { pointer: '/variants', message: 'variants must be a non-empty object' },
    ];
  }
  const expectedType = variantTypeOf(
    variants[names[0] as string] as VariantValue,
  );
  for (const name of names) {
    const value = variants[name] as VariantValue;
    const actualType = variantTypeOf(value);
    if (actualType !== expectedType) {
      problems.push({
        pointer: `/variants/${name}`,
        message: `variant value type mismatch at /variants/${name}: expected ${expectedType}, got ${actualType ?? 'null'}`,
      });
    }
  }
  return problems;
}

function conditionIsValid(
  condition: unknown,
  problems: ValidationProblem[],
  basePointer: string,
): void {
  if (typeof condition !== 'object' || condition === null) {
    problems.push({
      pointer: `${basePointer}`,
      message: 'condition must be an object',
    });
    return;
  }
  const c = condition as Record<string, unknown>;
  const attribute = c.attribute;
  if (
    typeof attribute !== 'string' ||
    attribute.length < 1 ||
    attribute.length > 128 ||
    attribute.startsWith('$')
  ) {
    problems.push({
      pointer: `${basePointer}/attribute`,
      message:
        'condition attribute must be 1-128 chars and must not start with $',
    });
  }
  const op = c.op;
  if (
    typeof op !== 'string' ||
    !(ATTRIBUTE_OPS as readonly string[]).includes(op)
  ) {
    problems.push({
      pointer: `${basePointer}/op`,
      message: `condition op must be one of ${ATTRIBUTE_OPS.join(', ')}`,
    });
    return;
  }
  if (op === 'exists') {
    if ('value' in c) {
      problems.push({
        pointer: `${basePointer}/value`,
        message: 'condition op "exists" must not carry a value',
      });
    }
    return;
  }
  const value = c.value;
  if (op === 'in') {
    if (
      !Array.isArray(value) ||
      value.length === 0 ||
      !value.every(isVariantValue)
    ) {
      problems.push({
        pointer: `${basePointer}/value`,
        message: 'condition op "in" requires a non-empty array of scalars',
      });
      return;
    }
    const elementType = typeof value[0];
    if (!value.every((v) => typeof v === elementType)) {
      problems.push({
        pointer: `${basePointer}/value`,
        message: 'condition op "in" array elements must share one type',
      });
    }
    return;
  }
  if (op === 'starts_with' || op === 'ends_with') {
    if (typeof value !== 'string' || value.length < 1) {
      problems.push({
        pointer: `${basePointer}/value`,
        message: `condition op "${op}" requires a non-empty string`,
      });
    }
    return;
  }
  if (op === 'eq' || op === 'neq') {
    if (!isVariantValue(value)) {
      problems.push({
        pointer: `${basePointer}/value`,
        message: `condition op "${op}" requires a string or number value`,
      });
    }
    return;
  }
  // gt / gte / lt / lte require a number.
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    problems.push({
      pointer: `${basePointer}/value`,
      message: `condition op "${op}" requires a numeric value`,
    });
  }
}

function validateAttributeRule(
  rule: unknown,
  index: number,
  variants: Record<string, VariantValue>,
  problems: ValidationProblem[],
): void {
  const base = `/rules/${index}`;
  if (typeof rule !== 'object' || rule === null) {
    problems.push({ pointer: base, message: 'rule must be an object' });
    return;
  }
  const r = rule as Record<string, unknown>;
  if (r.type !== 'attribute') {
    return; // handled by the percentage branch / shape check below
  }
  const conditions = r.conditions;
  if (!Array.isArray(conditions) || conditions.length === 0) {
    problems.push({
      pointer: `${base}/conditions`,
      message: 'attribute rule requires a non-empty conditions array',
    });
    return;
  }
  conditions.forEach((condition, i) =>
    conditionIsValid(condition, problems, `${base}/conditions/${i}`),
  );
  const variant = r.variant;
  if (typeof variant !== 'string' || !(variant in variants)) {
    problems.push({
      pointer: `${base}/variant`,
      message: `rule variant '${String(variant)}' does not exist`,
    });
  }
}

function validatePercentageRule(
  rule: unknown,
  index: number,
  problems: ValidationProblem[],
): void {
  const base = `/rules/${index}`;
  if (typeof rule !== 'object' || rule === null) {
    problems.push({ pointer: base, message: 'rule must be an object' });
    return;
  }
  const r = rule as Record<string, unknown>;
  if (r.type !== 'percentage') {
    return;
  }
  const splits = r.splits;
  if (!Array.isArray(splits) || splits.length === 0) {
    problems.push({
      pointer: `${base}/splits`,
      message: 'percentage rule requires a non-empty splits array',
    });
    return;
  }
  const seen = new Set<string>();
  for (const split of splits) {
    if (typeof split !== 'object' || split === null) {
      problems.push({
        pointer: `${base}/splits`,
        message: 'percentage split must be an object',
      });
      continue;
    }
    const s = split as Record<string, unknown>;
    const variant = s.variant;
    if (
      typeof variant !== 'string' ||
      !(
        typeof variant === 'string' &&
        variant.length > 0 &&
        variant.length <= MAX_VARIANT_VALUE_TYPE_LENGTH
      )
    ) {
      problems.push({
        pointer: `${base}/splits`,
        message: 'percentage split variant must be a non-empty string',
      });
      continue;
    }
    if (seen.has(variant)) {
      problems.push({
        pointer: `${base}/splits`,
        message: `percentage split variant '${variant}' repeats within splits`,
      });
    }
    seen.add(variant);
    const weight = s.weight;
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
      problems.push({
        pointer: `${base}/splits`,
        message: 'percentage split weight must be a positive number',
      });
    }
  }
}

/**
 * All-at-once definition validation (FR-14): returns the full list of problems
 * with JSON-pointer-style paths into the request body; empty array = valid.
 */
export function validateDefinition(input: unknown): ValidationProblem[] {
  const problems: ValidationProblem[] = [];
  if (typeof input !== 'object' || input === null) {
    return [{ pointer: '', message: 'definition must be an object' }];
  }
  const d = input as Record<string, unknown>;

  if (typeof d.enabled !== 'boolean') {
    problems.push({
      pointer: '/enabled',
      message: 'enabled must be a boolean',
    });
  }

  const variants = (d.variants ?? {}) as Record<string, VariantValue>;
  if (
    typeof d.variants !== 'object' ||
    d.variants === null ||
    Array.isArray(d.variants)
  ) {
    problems.push({
      pointer: '/variants',
      message: 'variants must be an object',
    });
  } else {
    problems.push(...validateVariantNames(variants));
    problems.push(...validateVariantValues(variants));
  }

  const defaultVariant = d.defaultVariant;
  const hasDefault =
    typeof defaultVariant === 'string' &&
    Object.prototype.hasOwnProperty.call(variants, defaultVariant);
  if (typeof defaultVariant !== 'string' || !hasDefault) {
    problems.push({
      pointer: '/defaultVariant',
      message: `defaultVariant '${String(defaultVariant)}' must reference an existing variant`,
    });
  }

  const rules = d.rules;
  if (!Array.isArray(rules)) {
    problems.push({ pointer: '/rules', message: 'rules must be an array' });
    return problems;
  }
  const percentageIndexes: number[] = [];
  rules.forEach((rule, i) => {
    const r = rule as Record<string, unknown>;
    if (r?.type === 'percentage') {
      percentageIndexes.push(i);
      validatePercentageRule(rule, i, problems);
    } else {
      validateAttributeRule(rule, i, variants, problems);
    }
  });
  if (percentageIndexes.length > 1) {
    problems.push({
      pointer: `/rules/${percentageIndexes[1]}`,
      message: 'at most one percentage rule is allowed per definition (FR-18)',
    });
  }
  if (
    percentageIndexes.length === 1 &&
    percentageIndexes[0] !== rules.length - 1
  ) {
    problems.push({
      pointer: `/rules/${percentageIndexes[0]}`,
      message: 'percentage rule must be the last rule (FR-18)',
    });
  }

  return problems;
}
