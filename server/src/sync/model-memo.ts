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
 * The compiled document is computed once per state and served from memory on
 * steady-state sync polls; invalidation happens on commit (store mutations).
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

export class FlagdModelMemo {
  private cache = new Map<string, CompiledFlagdModel>();

  get(input: FlagdModelMemoInput): CompiledFlagdModel {
    const key = `${input.projectId}:${input.env}`;
    const cached = this.cache.get(key);
    const version = input.flags.reduce((max, flag) => Math.max(max, flag.version), 0);
    if (cached && cached.version === version) {
      return cached;
    }
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
    this.cache.set(key, compiled);
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
