/** Domain-wide capability and identifier types shared by store, auth and routes. */

export const ROLES = ['admin', 'developer', 'product-owner'] as const;
export type Role = (typeof ROLES)[number];

export const API_KEY_SCOPES = ['manage', 'evaluate', 'sync', 'all'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export type ActorType = 'session' | 'api_key';

/** Effective per-project role of a caller; `null` = no access to the project. */
export type EffectiveRole = Role | null;

/** The caller holds any role that may act on a project they are assigned to. */
export function hasProjectAccess(role: EffectiveRole): boolean {
  return role !== null;
}

/** The caller holds full (admin) capability on the project. */
export function isFullAccess(role: EffectiveRole): boolean {
  return role === 'admin';
}

/**
 * Capability ladder (FR-54): a capability at or above a level implies all lower
 * levels — the "union" of two grants collapses to the stronger of the two.
 */
const CAPABILITY_LADDER: readonly EffectiveRole[] = ['product-owner', 'developer', 'admin'];

/**
 * Effective capability of a caller for one project: the union of the global role and
 * the per-project membership role (FR-54). A membership may elevate a caller on that
 * project but never reduce the global role; a caller holding neither a global admin
 * capability nor a project membership has none (`null`).
 */
export function effectiveCapability(
  globalRole: string | null | undefined,
  membershipRole: string | null | undefined,
): EffectiveRole {
  const rankOf = (role: string | null | undefined): number => {
    // Accept both the canonical (`product-owner`) and DB enum (`PRODUCT_OWNER`) spellings.
    const normalized = (role ?? '').trim().toLowerCase().replace(/_/g, '-');
    const index = normalized === '' ? -1 : CAPABILITY_LADDER.indexOf(normalized as EffectiveRole);
    return index;
  };
  const globalRank = rankOf(globalRole);
  const membershipRank = rankOf(membershipRole);
  if (globalRank === CAPABILITY_LADDER.indexOf('admin')) return 'admin';
  if (membershipRank < 0) return null;
  return CAPABILITY_LADDER[Math.max(globalRank, membershipRank)] as EffectiveRole;
}
