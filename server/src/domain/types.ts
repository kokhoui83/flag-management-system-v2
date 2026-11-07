/**
 * Capability vocabulary + union semantics (FR-54 / docs/01-requirements.md §4.9.1).
 * Implemented once in `@fms/shared` (the canonical module consumed by both the management
 * API and the Vue dashboard) and re-exported here for the server-side call sites.
 */

export {
  ROLES,
  API_KEY_SCOPES,
  effectiveCapability,
  hasProjectAccess,
  isFullAccess,
  type ApiKeyScope,
  type EffectiveRole,
  type Role,
} from '@fms/shared';

/** Actor kind of an audit entry: `session` (dashboard user) or `api_key` (machine). */
export type ActorType = 'session' | 'api_key';
