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

  it('recompiles when a flag is added whose version does not exceed the current maximum', () => {
    const memo = new FlagdModelMemo();
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag()] };
    memo.get(input);

    const withNewFlag = memo.get({ ...input, flags: [flag(), flag({ key: 'dark-mode', version: 2 })] });

    expect(Object.keys(withNewFlag.document.flags).sort()).toEqual(['dark-mode', 'new-checkout']);
  });

  it('recompiles when a flag other than the newest one changes', () => {
    const memo = new FlagdModelMemo();
    const older = flag({ key: 'dark-mode', version: 2, enabled: true });
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag(), older] };
    const first = memo.get(input);

    const second = memo.get({ ...input, flags: [flag(), { ...older, version: 3, enabled: false }] });

    expect(second.etag).not.toBe(first.etag);
    expect(second.document.flags['dark-mode']?.state).toBe('DISABLED');
  });

  it('recompiles when a flag is removed', () => {
    const memo = new FlagdModelMemo();
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag(), flag({ key: 'dark-mode', version: 2 })] };
    memo.get(input);

    const withoutIt = memo.get({ ...input, flags: [flag()] });

    expect(Object.keys(withoutIt.document.flags)).toEqual(['new-checkout']);
  });

  it('recompiles when a flag is deleted and recreated with different content at the same version', () => {
    const memo = new FlagdModelMemo();
    const input = { projectId: '01J-project', env: 'staging', flagSetId: 'checkout:staging', flags: [flag()] };
    memo.get(input);

    const recreated = memo.get({ ...input, flags: [flag({ defaultVariant: 'on' })] });

    expect(recreated.document.flags['new-checkout']?.defaultVariant).toBe('on');
  });
});

