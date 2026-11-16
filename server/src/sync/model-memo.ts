import {
  compileFlagdModel,
  etagFor,
  stateBodyOf,
  stableStringify,
  variantTypesOf,
  type FlagdFlagInput,
  type FlagdModelDocument,
} from '../domain/flagd-model';

/**
 * In-process per (project, env) flagd model memo (architecture §2.1).
 *
 * The compiled document is computed once per flag state and served from memory on
 * steady-state sync polls. Store mutations also invalidate their entry, but correctness does
 * not depend on that: a changed state never matches the memoized one.
 */
export interface CompiledFlagdModel {
  version: number;
  body: string;
  etag: string;
  document: FlagdModelDocument;
  variantTypes: Record<string, string>;
}

export interface FlagdModelMemoInput {
  projectId: string;
  env: string;
  flagSetId: string;
  flags: FlagdFlagInput[];
  /** Compile timestamp override (tests); defaults to the current time. */
  generatedAt?: string;
}

interface MemoEntry {
  /** Serialized flag state the entry was compiled from. */
  fingerprint: string;
  compiled: CompiledFlagdModel;
}

export class FlagdModelMemo {
  private cache = new Map<string, MemoEntry>();

  /**
   * The memo is keyed by the exact flag state, not by a version number: the highest flag
   * version stays the same when another flag is added, changed or removed, so it cannot tell
   * whether the set changed. An unchanged state returns the same document (same body, ETag
   * and `generatedAt`); anything else is recompiled.
   */
  get(input: FlagdModelMemoInput): CompiledFlagdModel {
    const key = `${input.projectId}:${input.env}`;
    const fingerprint = stableStringify(input.flags);
    const cached = this.cache.get(key);
    if (cached && cached.fingerprint === fingerprint) {
      return cached.compiled;
    }
    const version = input.flags.reduce((max, flag) => Math.max(max, flag.version), 0);
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const document = compileFlagdModel({
      flagSetId: input.flagSetId,
      generatedAt,
      flags: input.flags,
    });
    const compiled: CompiledFlagdModel = {
      version,
      body: stableStringify(document),
      etag: etagFor(stateBodyOf(document)),
      document,
      variantTypes: variantTypesOf(input.flags),
    };
    this.cache.set(key, { fingerprint, compiled });
    return compiled;
  }

  invalidate(projectId: string, env: string): void {
    this.cache.delete(`${projectId}:${env}`);
  }

  invalidateByProject(projectId: string): void {
    for (const key of [...this.cache.keys()]) {
      if (key.startsWith(`${projectId}:`)) {
        this.cache.delete(key);
      }
    }
  }
}
