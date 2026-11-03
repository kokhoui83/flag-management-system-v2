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
