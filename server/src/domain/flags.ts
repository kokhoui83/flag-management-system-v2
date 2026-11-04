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

/** Which fields of the stored definition the incoming one changes (FR-5 change detection). */
interface DefinitionChange {
  enabled: boolean;
  variants: boolean;
  defaultVariant: boolean;
  rules: boolean;
}

function changedFields(stored: StoredFlagDefinition, incoming: FlagDefinitionInput): DefinitionChange {
  const sameVariants =
    Object.keys(stored.variants).length === Object.keys(incoming.variants).length &&
    Object.keys(incoming.variants).every(
      (key) => key in stored.variants && stored.variants[key] === incoming.variants[key],
    );
  return {
    enabled: stored.enabled !== incoming.enabled,
    variants: !sameVariants,
    defaultVariant: stored.defaultVariant !== incoming.defaultVariant,
    rules: stableStringify(stored.rules) !== stableStringify(incoming.rules),
  };
}

/** True when the incoming (validated) definition differs from the stored one. */
export function definitionsEqual(
  stored: StoredFlagDefinition,
  incoming: FlagDefinitionInput,
): boolean {
  const change = changedFields(stored, incoming);
  const changed = change.enabled || change.variants || change.defaultVariant || change.rules;
  return !changed;
}

/**
 * FR-59: a product owner may only change `enabled`. An identical put is an idempotent
 * no-op and stays allowed; any variant/rule/default change is rejected.
 */
export function solelyEnabledChanged(
  stored: StoredFlagDefinition,
  incoming: FlagDefinitionInput,
): boolean {
  const change = changedFields(stored, incoming);
  return change.enabled && !change.variants && !change.defaultVariant && !change.rules;
}

/**
 * FR-59: whether a product owner may submit the (validated) definition update —
 * enabled-only change, or an identical idempotent no-op. Creates (no stored definition
 * yet) are not toggles and are therefore rejected for product owners.
 */
export function productOwnerPutAllowed(
  stored: StoredFlagDefinition | undefined,
  incoming: FlagDefinitionInput,
): boolean {
  if (stored === undefined) return false;
  if (definitionsEqual(stored, incoming)) return true;
  return solelyEnabledChanged(stored, incoming);
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
