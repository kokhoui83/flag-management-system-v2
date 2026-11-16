import { describe, it, expect } from 'vitest';
import { capabilityMatrix } from './capabilityMatrix';

// The requirements table (docs/01-requirements.md §4.9.1), cell for cell.
const REQUIRED: Array<
  [string, 'global' | 'project', boolean, boolean, boolean]
> = [
  ['Create projects', 'global', true, false, false],
  ['Invite members / assign projects', 'global', true, false, false],
  ['Manage API keys', 'global', true, false, false],
  ['Read audit', 'global', true, false, false],
  ['Create project environments', 'project', true, true, false],
  ['Create flags, edit description', 'project', true, true, false],
  ['Delete flags', 'project', true, false, false],
  [
    'Create / edit / copy definitions (variants, rules, default)',
    'project',
    true,
    true,
    false,
  ],
  ["Toggle a flag's enabled state", 'project', true, true, true],
  ['View flags and definitions', 'project', true, true, true],
  ['Evaluate flags (playground/API)', 'project', true, true, true],
];

describe('capabilityMatrix (FR-54 / FR-58 / FR-59)', () => {
  it('matches the requirements capability matrix cell for cell', () => {
    expect(
      capabilityMatrix().map((row) => [
        row.capability,
        row.scope,
        row.allowed.admin,
        row.allowed.developer,
        row.allowed['product-owner'],
      ]),
    ).toEqual(REQUIRED);
  });
});
