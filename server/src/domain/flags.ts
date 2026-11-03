import { validateDefinition, type FlagDefinitionInput, type VariantValue } from '@fms/shared';

/**
 * Domain flag logic (M1: flags & definitions core, roadmap M1). Pure functions
 * only — no framework/DB concerns (NFR-8).
 */

export interface StoredFlagDefinition {
  enabled: boolean;
  variants: Record<string, VariantValue>;
  defaultVariant: string;
  /** Canonical rule array (JSON column) as stored. */
  rules: unknown;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** True when the incoming (validated) definition differs from the stored one. */
export function definitionsEqual(
  stored: StoredFlagDefinition,
  incoming: FlagDefinitionInput,
): boolean {
  const sameVariants =
    Object.keys(stored.variants).length === Object.keys(incoming.variants).length &&
    Object.keys(incoming.variants).every(
      (key) => key in stored.variants && stored.variants[key] === incoming.variants[key],
    );
  return (
    stored.enabled === incoming.enabled &&
    sameVariants &&
    stored.defaultVariant === incoming.defaultVariant &&
    stableStringify(stored.rules) === stableStringify(incoming.rules)
  );
}

/**
 * Flag version semantics (FR-5): starts at 1 on flag creation; +1 on every
 * definition upsert that changes state; an idempotent put (identical content)
 * does not bump.
 */
export function nextFlagVersion(
  currentVersion: number,
  existing: StoredFlagDefinition | null,
  incoming: FlagDefinitionInput,
): number {
  const changed = existing === null || !definitionsEqual(existing, incoming);
  if (!changed) {
    return currentVersion;
  }
  return currentVersion + 1;
}

export { validateDefinition };
