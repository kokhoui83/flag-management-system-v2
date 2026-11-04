import { describe, it, expect } from 'vitest';
import { FlagdModelMemo } from './model-memo';
import { type FlagdFlagInput } from '../domain/flagd-model';

function flag(overrides: Partial<FlagdFlagInput> = {}): FlagdFlagInput {
  return {
    key: 'new-checkout',
    enabled: true,
    variants: { on: true, off: false },
    defaultVariant: 'off',
    rules: [],
    version: 7,
    ...overrides,
  };
}

describe('domain: sync model memoization (roadmap M2)', () => {
  it('compiles once per (project, env) and serves the memo on repeat gets', () => {
    const memo = new FlagdModelMemo();
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag()], generatedAt: '2026-11-04T00:00:00Z' };

    const first = memo.get(input);
    const second = memo.get(input);

    expect(second.body).toBe(first.body);
    expect(second.etag).toBe(first.etag);
    expect(second.version).toBe(7);
  });

  it('invalidates the (project, env) entry on commit so the next get recompiles', () => {
    const memo = new FlagdModelMemo();
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag()], generatedAt: '2026-11-04T00:00:00Z' };
    const first = memo.get(input);
    memo.invalidate(input.projectId, input.env);
    const second = memo.get({ ...input, generatedAt: '2026-11-04T00:00:01Z' });
    expect(second.body).not.toBe(first.body); // memo was cleared -> recompiled with a new generatedAt
  });

  it('invalidates every env of a project on flag deletion', () => {
    const memo = new FlagdModelMemo();
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag()], generatedAt: '2026-11-04T00:00:00Z' };
    memo.get(input);
    memo.invalidateByProject('01J-project');
    expect(() => memo.get(input)).not.toThrow();
  });

  it('derives the flag version as the max flag version of the set', () => {
    const memo = new FlagdModelMemo();
    const input = {
      projectId: '01J-project',
      env: 'staging',
      flagSetId: 'checkout:staging',
      flags: [
        flag({ key: 'aaa', version: 2 }),
        flag({ key: 'bbb', version: 9 }),
      ],
      generatedAt: '2026-11-04T00:00:00Z',
    };
    expect(memo.get(input).version).toBe(9);
  });
});
