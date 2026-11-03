import { PrismaClient, type Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { hash as argon2Hash, verify as argon2Verify } from 'argon2';
import { generateUlid } from '@fms/shared';
import { nextFlagVersion } from '../domain/flags';
import { DEFAULT_ENVIRONMENTS } from '../config';
import type { ActorType, Role } from '../domain/types';
import type { FlagRule } from '@fms/shared';

export interface UserRecord {
  userName: string;
  passwordHash: string;
  globalRole: string;
  createdAt: Date;
}

export interface ProjectRecord {
  id: string;
  key: string;
  name: string;
}

export interface MembershipRecord {
  userName: string;
  projectId: string;
  role: string;
  createdAt: Date;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scope: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdBy: string;
}

export interface AuditLogRecord {
  id: string;
  createdAt: Date;
  actorType: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  env: string | null;
  before: unknown;
  after: unknown;
}

export interface FlagEnvironmentStatus {
  enabled: boolean;
  variantType: string;
}

export interface FlagSummary {
  key: string;
  description: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  environments: Record<string, FlagEnvironmentStatus>;
}

export interface FlagDetail {
  key: string;
  description: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  definitions: Record<
    string,
    {
      enabled: boolean;
      variants: Record<string, boolean | number | string>;
      defaultVariant: string;
      rules: unknown;
      updatedAt: Date;
    }
  >;
}

export interface AuditQuery {
  limit: number;
  before: string | null;
  action: string | null;
  entity: string | null;
  actor: string | null;
}

export interface AuditPage {
  entries: AuditLogRecord[];
  nextBefore: string | null;
}

export interface PutDefinitionResult {
  found: boolean;
  flagKey: string;
  env: string;
  version: number;
  /** true when the stored definition already matched the payload (idempotent no-op). */
  unchanged: boolean;
}

export interface CreateProjectResult {
  ok: boolean;
  conflict?: 'name' | 'key';
  project?: ProjectRecord;
}

export interface CreateApiKeyResult {
  key: ApiKeyRecord;
  /** Plaintext shown once; never stored. */
  plaintext: string;
}

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  environments: string[];
  members: Array<{ user: string; role: string }>;
}

export interface MemberAssignment {
  projectId: string;
  role: string;
}

export interface Store {
  findUserByName(userName: string): Promise<UserRecord | null>;
  findMembership(userName: string, projectId: string): Promise<MembershipRecord | null>;
  findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null>;
  verifyUserPassword(userName: string, password: string): Promise<boolean>;
  createProject(input: { key: string; name: string; actor: string }): Promise<CreateProjectResult>;
  listProjects(input: {
    isAdmin: boolean;
    username: string;
    assignments: MemberAssignment[];
  }): Promise<ProjectSummary[]>;
  listMemberAssignments(userName: string): Promise<MemberAssignment[]>;
  createEnvironment(projectId: string, env: string, actor: string): Promise<'created' | 'conflict'>;
  listMembers(projectId: string): Promise<Array<{ user: string; role: string }>>;
  inviteMember(input: {
    username: string;
    role: Role;
    projectIds: string[];
    actor: string;
  }): Promise<{ user: string; tempPassword: string; memberships: Array<{ projectId: string; role: string }> }>;
  createFlag(input: { projectId: string; key: string; description: string; actor: string }): Promise<'created' | 'conflict'>;
  listFlags(projectId: string): Promise<FlagSummary[]>;
  getFlag(projectId: string, key: string): Promise<FlagDetail | null>;
  updateFlagDescription(projectId: string, key: string, description: string, actor: string): Promise<'updated' | 'not_found'>;
  deleteFlag(projectId: string, key: string, actor: string): Promise<'deleted' | 'not_found'>;
  putDefinition(input: {
    projectId: string;
    flagKey: string;
    env: string;
    definition: {
      enabled: boolean;
      variants: Record<string, boolean | number | string>;
      defaultVariant: string;
      rules: FlagRule[];
    };
    actor: string;
  }): Promise<PutDefinitionResult>;
  copyDefinition(input: {
    projectId: string;
    flagKey: string;
    env: string;
    fromEnv: string;
    actor: string;
  }): Promise<'copied' | 'not_found'>;
  listAudit(query: AuditQuery): Promise<AuditPage>;
  createApiKey(input: { name: string; scope: string; createdBy: string }): Promise<CreateApiKeyResult>;
  listApiKeys(): Promise<ApiKeyRecord[]>;
  revokeApiKey(id: string): Promise<'revoked' | 'not_found'>;
}

function variantTypeOf(variants: unknown): string {
  const first = Object.values(variants as Record<string, unknown>)[0];
  if (typeof first === 'boolean') return 'boolean';
  if (typeof first === 'number') return 'number';
  if (typeof first === 'string') return 'string';
  return 'boolean';
}

async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    action: string;
    entity: string;
    entityId: string;
    env: string | null;
    before: unknown;
    after: unknown;
    actorType: ActorType;
    actorName: string;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      id: generateUlid(),
      createdAt: new Date(),
      actorType: input.actorType === 'api_key' ? 'API_KEY' : 'SESSION',
      actorName: input.actorName,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      env: input.env,
      before: (input.before ?? null) as Prisma.InputJsonValue,
      after: (input.after ?? null) as Prisma.InputJsonValue,
    },
  });
}

export function createStore(prisma: PrismaClient): Store {
  return {
    // ---------- auth resolution ----------

    findUserByName: (userName) => prisma.user.findUnique({ where: { userName } }),
    findMembership: (userName, projectId) =>
      prisma.projectMembership.findUnique({
        where: { userName_projectId: { userName, projectId } },
      }),
    findApiKeyByHash: (keyHash) => prisma.apiKey.findUnique({ where: { keyHash } }),
    verifyUserPassword: async (userName, password) => {
      const user = await prisma.user.findUnique({ where: { userName } });
      if (!user) return false;
      return argon2Verify(user.passwordHash, password);
    },

    // ---------- projects / directory ----------

    createProject: async ({ key, name, actor }) => {
      const byName = await prisma.project.findUnique({ where: { name } });
      if (byName) return { ok: false, conflict: 'name' };
      const byKey = await prisma.project.findUnique({ where: { key } });
      if (byKey) return { ok: false, conflict: 'key' };
      const created = await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: { id: generateUlid(), key, name },
        });
        for (const env of DEFAULT_ENVIRONMENTS) {
          await tx.projectEnvironment.create({ data: { projectId: project.id, env } });
        }
        await writeAudit(tx, {
          action: 'project.create',
          entity: 'project',
          entityId: project.id,
          env: null,
          before: null,
          after: { id: project.id, key: project.key, name: project.name },
          actorType: 'session',
          actorName: actor,
        });
        return project;
      });
      return { ok: true, project: { id: created.id, key: created.key, name: created.name } };
    },
    listProjects: async ({ isAdmin, assignments }) => {
      if (isAdmin) {
        const projects = await prisma.project.findMany({ orderBy: { name: 'asc' } });
        const result: ProjectSummary[] = [];
        for (const project of projects) {
          const envs = await prisma.projectEnvironment.findMany({
            where: { projectId: project.id },
            orderBy: { env: 'asc' },
          });
          const members = await prisma.projectMembership.findMany({
            where: { projectId: project.id },
            include: { user: true },
            orderBy: { userName: 'asc' },
          });
          result.push({
            id: project.id,
            key: project.key,
            name: project.name,
            environments: envs.map((e) => e.env),
            members: members.map((m) => ({ user: m.user.userName, role: m.role })),
          });
        }
        return result;
      }
      const result: ProjectSummary[] = [];
      for (const assignment of assignments) {
        const project = await prisma.project.findUnique({ where: { id: assignment.projectId } });
        if (!project) continue;
        const envs = await prisma.projectEnvironment.findMany({
          where: { projectId: project.id },
          orderBy: { env: 'asc' },
        });
        const members = await prisma.projectMembership.findMany({
          where: { projectId: project.id },
          include: { user: true },
          orderBy: { userName: 'asc' },
        });
        result.push({
          id: project.id,
          key: project.key,
          name: project.name,
          environments: envs.map((e) => e.env),
          members: members.map((m) => ({ user: m.user.userName, role: m.role })),
        });
      }
      return result;
    },

    listMemberAssignments: (userName) =>
      prisma.projectMembership.findMany({
        where: { userName },
        select: { projectId: true, role: true },
      }),

    createEnvironment: async (projectId, env, actor) => {
      const existing = await prisma.projectEnvironment.findUnique({
        where: { projectId_env: { projectId, env } },
      });
      if (existing) return 'conflict';
      await prisma.$transaction(async (tx) => {
        await tx.projectEnvironment.create({ data: { projectId, env } });
        await writeAudit(tx, {
          action: 'project.environment.create',
          entity: 'project',
          entityId: projectId,
          env,
          before: null,
          after: { env },
          actorType: 'session',
          actorName: actor,
        });
      });
      return 'created';
    },

    listMembers: async (projectId) =>
      prisma.projectMembership.findMany({
        where: { projectId },
        include: { user: true },
        orderBy: { userName: 'asc' },
      }).then((rows) => rows.map((r) => ({ user: r.user.userName, role: r.role }))),

    inviteMember: async ({ username, role, projectIds, actor }) => {
      const tempPassword = `temp-${randomBytes(9).toString('base64url')}`;
      const passwordHash = await argon2Hash(tempPassword);
      const memberships: Array<{ projectId: string; role: string }> = [];
      const globalRole = role.toUpperCase() as 'ADMIN' | 'DEVELOPER' | 'PRODUCT_OWNER';
      await prisma.$transaction(async (tx) => {
        await tx.user.upsert({
          where: { userName: username },
          update: { passwordHash, globalRole },
          create: { userName: username, passwordHash, globalRole },
        });
        for (const projectId of projectIds) {
          await tx.projectMembership.upsert({
            where: { userName_projectId: { userName: username, projectId } },
            update: { role: globalRole },
            create: { userName: username, projectId, role: globalRole },
          });
          memberships.push({ projectId, role });
        }
        await writeAudit(tx, {
          action: 'project.member.invite',
          entity: 'project',
          entityId: projectIds[0] ?? username,
          env: null,
          before: null,
          after: { user: username, role, projects: projectIds },
          actorType: 'session',
          actorName: actor,
        });
      });
      return { user: username, tempPassword, memberships };
    },

    createFlag: async ({ projectId, key, description, actor }) => {
      const existing = await prisma.flag.findFirst({ where: { projectId, key } });
      if (existing) return 'conflict';
      await prisma.$transaction(async (tx) => {
        const created = await tx.flag.create({
          data: { id: generateUlid(), projectId, key, description, version: 1 },
        });
        await writeAudit(tx, {
          action: 'flag.create',
          entity: 'flag',
          entityId: key,
          env: null,
          before: null,
          after: { id: created.id, key: created.key, description: created.description, version: created.version },
          actorType: 'session',
          actorName: actor,
        });
      });
      return 'created';
    },

    listFlags: async (projectId) =>
      prisma.flag.findMany({
        where: { projectId },
        orderBy: { key: 'asc' },
      }).then(async (flags) => {
        const result: FlagSummary[] = [];
        for (const flag of flags) {
          const definitions = await prisma.flagDefinition.findMany({
            where: { flagId: flag.id },
          });
          const environments: Record<string, FlagEnvironmentStatus> = {};
          for (const def of definitions) {
            environments[def.env] = {
              enabled: def.enabled,
              variantType: variantTypeOf(def.variants),
            };
          }
          result.push({
            key: flag.key,
            description: flag.description,
            version: flag.version,
            createdAt: flag.createdAt,
            updatedAt: flag.updatedAt,
            environments,
          });
        }
        return result;
      }),

    getFlag: async (projectId, key) => {
      const flag = await prisma.flag.findFirst({
        where: { projectId, key },
        include: { definitions: true },
      });
      if (!flag) return null;
      const definitions: FlagDetail['definitions'] = {};
      for (const def of flag.definitions) {
        definitions[def.env] = {
          enabled: def.enabled,
          variants: def.variants as Record<string, boolean | number | string>,
          defaultVariant: def.defaultVariant,
          rules: def.rules,
          updatedAt: def.updatedAt,
        };
      }
      return {
        key: flag.key,
        description: flag.description,
        version: flag.version,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
        definitions,
      };
    },

    updateFlagDescription: async (projectId, key, description, actor) => {
      const flag = await prisma.flag.findFirst({ where: { projectId, key } });
      if (!flag) return 'not_found';
      await prisma.$transaction(async (tx) => {
        await tx.flag.update({ where: { id: flag.id }, data: { description } });
        await writeAudit(tx, {
          action: 'flag.update',
          entity: 'flag',
          entityId: key,
          env: null,
          before: { description: flag.description },
          after: { description },
          actorType: 'session',
          actorName: actor,
        });
      });
      return 'updated';
    },

    deleteFlag: async (projectId, key, actor) => {
      const flag = await prisma.flag.findFirst({
        where: { projectId, key },
        include: { definitions: true },
      });
      if (!flag) return 'not_found';
      await prisma.$transaction(async (tx) => {
        await tx.flag.delete({ where: { id: flag.id } });
        await writeAudit(tx, {
          action: 'flag.delete',
          entity: 'flag',
          entityId: key,
          env: null,
          before: {
            flag: { key: flag.key, description: flag.description, version: flag.version },
            definitions: flag.definitions.map((d) => ({
              env: d.env,
              enabled: d.enabled,
              variants: d.variants,
              defaultVariant: d.defaultVariant,
              rules: d.rules,
            })),
          },
          after: null,
          actorType: 'session',
          actorName: actor,
        });
      });
      return 'deleted';
    },

    putDefinition: async ({ projectId, flagKey, env, definition, actor }) => {
      const flag = await prisma.flag.findFirst({ where: { projectId, key: flagKey } });
      if (!flag) {
        return { found: false, flagKey, env, version: 0, unchanged: false };
      }
      const existing = await prisma.flagDefinition.findUnique({
        where: { flag_def_flag_env: { flagId: flag.id, env } },
      });
      const nextVersion = nextFlagVersion(
        flag.version,
        existing
          ? {
              enabled: existing.enabled,
              variants: existing.variants as Record<string, boolean | number | string>,
              defaultVariant: existing.defaultVariant,
              rules: existing.rules,
            }
          : null,
        {
          enabled: definition.enabled,
          variants: definition.variants,
          defaultVariant: definition.defaultVariant,
          rules: definition.rules,
        },
      );
      const unchanged = existing !== null && nextVersion === flag.version;
      if (!unchanged) {
        const now = new Date();
        await prisma.$transaction(async (tx) => {
          if (existing) {
            await tx.flagDefinition.update({
              where: { flag_def_flag_env: { flagId: flag.id, env } },
              data: {
                enabled: definition.enabled,
                variants: definition.variants as Prisma.InputJsonValue,
                defaultVariant: definition.defaultVariant,
                rules: definition.rules as unknown as Prisma.InputJsonValue,
                updatedAt: now,
              },
            });
          } else {
            await tx.flagDefinition.create({
              data: {
                id: generateUlid(),
                flagId: flag.id,
                env,
                enabled: definition.enabled,
                variants: definition.variants as Prisma.InputJsonValue,
                defaultVariant: definition.defaultVariant,
                rules: definition.rules as unknown as Prisma.InputJsonValue,
              },
            });
          }
          await tx.flag.update({
            where: { id: flag.id },
            data: { version: nextVersion, updatedAt: now },
          });
          await writeAudit(tx, {
            action: existing ? 'definition.update' : 'definition.create',
            entity: 'definition',
            entityId: `${flagKey}:${env}`,
            env,
            before: existing
              ? {
                  enabled: existing.enabled,
                  variants: existing.variants,
                  defaultVariant: existing.defaultVariant,
                  rules: existing.rules,
                }
              : null,
            after: {
              enabled: definition.enabled,
              variants: definition.variants,
              defaultVariant: definition.defaultVariant,
              rules: definition.rules,
            },
            actorType: 'session',
            actorName: actor,
          });
        });
      }
      return { found: true, flagKey, env, version: nextVersion, unchanged };
    },

    copyDefinition: async ({ projectId, flagKey, env, fromEnv, actor }) => {
      const flag = await prisma.flag.findFirst({ where: { projectId, key: flagKey } });
      if (!flag) return 'not_found';
      const source = await prisma.flagDefinition.findUnique({
        where: { flag_def_flag_env: { flagId: flag.id, env: fromEnv } },
      });
      if (!source) return 'not_found';
      const target = await prisma.flagDefinition.findUnique({
        where: { flag_def_flag_env: { flagId: flag.id, env } },
      });
      const now = new Date();
      await prisma.$transaction(async (tx) => {
        await tx.flagDefinition.upsert({
          where: { flag_def_flag_env: { flagId: flag.id, env } },
          update: {
            enabled: source.enabled,
            variants: source.variants as Prisma.InputJsonValue,
            defaultVariant: source.defaultVariant,
            rules: source.rules as Prisma.InputJsonValue,
            updatedAt: now,
          },
          create: {
            id: generateUlid(),
            flagId: flag.id,
            env,
            enabled: source.enabled,
            variants: source.variants as Prisma.InputJsonValue,
            defaultVariant: source.defaultVariant,
            rules: source.rules as Prisma.InputJsonValue,
          },
        });
        await tx.flag.update({ where: { id: flag.id }, data: { version: flag.version + 1, updatedAt: now } });
        await writeAudit(tx, {
          action: 'definition.copy',
          entity: 'definition',
          entityId: `${flagKey}:${env}`,
          env,
          before: target
            ? {
                enabled: target.enabled,
                variants: target.variants,
                defaultVariant: target.defaultVariant,
                rules: target.rules,
              }
            : null,
          after: {
            enabled: source.enabled,
            variants: source.variants,
            defaultVariant: source.defaultVariant,
            rules: source.rules,
            copiedFrom: fromEnv,
          },
          actorType: 'session',
          actorName: actor,
        });
      });
      return 'copied';
    },

    listAudit: async (query) => {
      const entries = await prisma.auditLog.findMany({
        where: {
          ...(query.action ? { action: query.action } : {}),
          ...(query.entity ? { entity: query.entity } : {}),
          ...(query.actor ? { actorName: { contains: query.actor } } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit,
        ...(query.before ? { cursor: { id: query.before }, skip: 1 } : {}),
      });
      const nextBefore = entries.length > 0 ? entries[0]!.id : null;
      return { entries, nextBefore };
    },

    createApiKey: async ({ name, scope, createdBy }) => {
      const keyBytes = randomBytes(32);
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const keyBody = Array.from(keyBytes, (b) => alphabet[b % 62]).join('');
      const plaintext = `fms_${keyBody}`;
      const keyHash = createHash('sha256').update(plaintext).digest('hex');
      const apiKeyScope = scope.toUpperCase() as 'MANAGE' | 'EVALUATE' | 'SYNC' | 'ALL';
      const key = await prisma.apiKey.create({
        data: { id: generateUlid(), name, keyHash, keyPrefix: plaintext.slice(0, 8), scope: apiKeyScope, createdBy },
      });
      return { key, plaintext };
    },

    listApiKeys: async () => prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } }),

    revokeApiKey: async (id) => {
      const key = await prisma.apiKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      return key.revokedAt !== null ? 'revoked' : 'not_found';
    },
  };
}
