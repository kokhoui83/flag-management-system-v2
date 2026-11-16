import { ROLES, type Role } from '@fms/shared';
import {
  projectCapabilities,
  type ProjectCapabilities,
} from './stores/session';

/** One row of the capability matrix (FR-54/FR-58/FR-59, docs/01-requirements.md §4.9.1). */
export interface CapabilityRow {
  capability: string;
  scope: 'global' | 'project';
  allowed: Record<Role, boolean>;
}

type ProjectFlag = Exclude<keyof ProjectCapabilities, 'role'>;

/** Global capabilities belong to the global admin role only. */
const GLOBAL_CAPABILITIES = [
  'Create projects',
  'Invite members / assign projects',
  'Manage API keys',
  'Read audit',
];

/** Project rows are derived from the same function that gates the controls on every screen. */
const PROJECT_CAPABILITIES: Array<[string, ProjectFlag]> = [
  ['Create project environments', 'canCreateEnvironments'],
  ['Create flags, edit description', 'canCreateFlags'],
  ['Delete flags', 'canDeleteFlags'],
  [
    'Create / edit / copy definitions (variants, rules, default)',
    'canEditDefinitions',
  ],
  ["Toggle a flag's enabled state", 'canToggle'],
  ['View flags and definitions', 'canView'],
  ['Evaluate flags (playground/API)', 'canView'],
];

function perRole(allowed: (role: Role) => boolean): Record<Role, boolean> {
  return Object.fromEntries(
    ROLES.map((role) => [role, allowed(role)]),
  ) as Record<Role, boolean>;
}

export function capabilityMatrix(): CapabilityRow[] {
  return [
    ...GLOBAL_CAPABILITIES.map((capability): CapabilityRow => ({
      capability,
      scope: 'global',
      allowed: perRole((role) => role === 'admin'),
    })),
    ...PROJECT_CAPABILITIES.map(([capability, flag]): CapabilityRow => ({
      capability,
      scope: 'project',
      allowed: perRole((role) => projectCapabilities(role)[flag]),
    })),
  ];
}
