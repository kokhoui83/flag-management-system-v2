import type { FastifyInstance, FastifyRequest } from 'fastify';
import { type AuthService } from './auth';
import {
  type ApiKeyRecord,
  type AuditPage,
  type PutDefinitionResult,
  type Store,
} from '../store';
import {
  validateDefinition,
  validateEnvName,
  validateFlagKey,
  type FlagDefinitionInput,
  type ValidationProblem,
  variantTypeOfVariants,
} from '@fms/shared';
import { FmsError, validationError } from './problem';
import { isFullAccess } from '../domain/types';
import { productOwnerPutAllowed } from '../domain/flags';
import { FlagdModelMemo } from '../sync/model-memo';
import { FlagdProviderRegistry } from '../evaluate/providers';
import { type FlagEvaluator } from '../evaluate/evaluator';
import { FlagChangeBroadcaster } from '../events/broadcaster';
import { startFlagChangeStream } from '../events/stream';
import type { ProviderRuntimeState } from '../evaluate/types';

export interface RouteServices {
  auth: AuthService;
  store: Store;
  memo: FlagdModelMemo;
  evaluator: FlagEvaluator;
  registry: FlagdProviderRegistry;
  broadcaster: FlagChangeBroadcaster;
}

function actorName(principal: {
  type: string;
  session?: { username: string };
  apiKey?: ApiKeyRecord;
}): string {
  if (principal.type === 'session')
    return principal.session?.username ?? 'session';
  return principal.apiKey?.name ?? 'api_key';
}

function paramsOf(request: FastifyRequest): Record<string, string> {
  return request.params as unknown as Record<string, string>;
}

function queryOf(request: FastifyRequest): Record<string, string> {
  const query = request.query as unknown;
  return (query ?? {}) as Record<string, string>;
}

function paramValue(source: Record<string, string>, key: string): string {
  const value = source[key];
  if (value === undefined) {
    throw new FmsError(
      404,
      'https://fms.local/errors/not-found',
      `Missing path parameter '${key}'`,
    );
  }
  return value;
}

/**
 * Queue a committed flag change for the (project, environment) flag set (ADR-0008; FR-51).
 * The SSE stream drains this queue once the bound flagd provider reports a configuration change.
 * Invoked synchronously right after the committing write (no intervening await), so a provider
 * sync cannot drain an empty queue and drop the change.
 */
function enqueueFlagChange(
  broadcaster: FlagChangeBroadcaster,
  flagSetId: string,
  flagKey: string,
  version: number,
): void {
  broadcaster.enqueue(flagSetId, {
    flagKey,
    version,
    at: new Date().toISOString(),
  });
}

function ifNoneMatchMatches(
  header: string | string[] | undefined,
  etag: string,
): boolean {
  const values = Array.isArray(header) ? header : header ? [header] : [];
  return values.some((value) => {
    const candidates = value.matchAll(
      /(?:^|,)\s*((?:W\/)?"[^"]*"|\*)(?=\s*(?:,|$))/g,
    );
    for (const [, candidate] of candidates) {
      if (!candidate) continue;
      if (candidate === '*') return true;
      if (
        (candidate.startsWith('W/') ? candidate.slice(2) : candidate) === etag
      )
        return true;
    }
    return false;
  });
}

export async function registerRoutes(
  app: FastifyInstance,
  services: RouteServices,
): Promise<void> {
  const { auth, store, memo, evaluator, registry, broadcaster } = services;

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async (_request, reply) => {
    // M3 readiness (FR-24/FR-47, architecture §7): alive + DB reachable + every flagd
    // provider (per project-namespaced flag set) READY → 200; else 503 `not_ready`.
    const db = await store.pingDatabase();
    const flagSets = await store.listFlagSets();
    const flagd: Record<string, ProviderRuntimeState> = {};
    for (const flagSet of flagSets) {
      await registry.getOrCreate(flagSet.flagSetId);
      flagd[flagSet.flagSetId] = registry.getState(flagSet.flagSetId);
    }
    const ready =
      db === 'OK' &&
      flagSets.every((flagSet) => flagd[flagSet.flagSetId] === 'READY');
    return reply
      .code(ready ? 200 : 503)
      .send({ status: ready ? 'ok' : 'not_ready', db, flagd });
  });

  // ---------------------------------------------------------------- auth

  app.post('/api/v1/auth/login', async (request, reply) => {
    const body = request.body as { username?: string; password?: string };
    const session =
      (await auth.verifyBootstrap(body.username ?? '', body.password ?? '')) ??
      (await auth.verifyUser(body.username ?? '', body.password ?? ''));
    if (!session) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Invalid credentials',
      );
    }
    // FR-36 / FR-39: a successful login is audited as `auth.login` before the token issues.
    await store.recordAuthLogin({
      username: session.username,
      actorName: session.username,
      actorType: 'session',
    });
    const token = auth.issue(session, 'jwt');
    reply
      .setCookie('fms_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 12 * 60 * 60,
      })
      .send({
        token,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      });
  });

  app.post('/api/v1/auth/logout', async (_request, reply) => {
    reply
      .setCookie('fms_token', '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
      })
      .send();
  });

  app.get('/api/v1/auth/session', async (request) => {
    // Dashboard identity surface (FR-53): the caller + their per-project assignments, from
    // which the UI derives the effective capability per project (FR-54).
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const identity = await auth.session(principal);
    return identity;
  });

  // ---------------------------------------------------------------- projects

  app.get('/api/v1/projects', async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const isAdmin = await auth.isAdmin(principal);
    if (principal.type === 'api_key' && !isAdmin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Manage scope required',
      );
    }
    const assignments =
      principal.type === 'session'
        ? await store.listMemberAssignments(principal.session.username)
        : [];
    const projects = await store.listProjects({
      isAdmin,
      username: '',
      assignments,
    });
    return { projects };
  });

  app.post('/api/v1/projects', async (request, reply) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const body = request.body as { key?: string; name?: string };
    if (!body.key || !body.name) {
      throw new FmsError(
        400,
        'https://fms.local/errors/validation',
        'key and name are required',
      );
    }
    const result = await store.createProject({
      key: body.key,
      name: body.name,
      actor: actorName(principal),
    });
    if (!result.ok) {
      throw new FmsError(
        409,
        'https://fms.local/errors/conflict',
        `Project '${body.name}' already exists`,
      );
    }
    return reply.code(201).send(result.project);
  });

  app.post(
    '/api/v1/projects/:projectId/environments',
    async (request, reply) => {
      const projectId = paramValue(paramsOf(request), 'projectId');
      const principal = request.principal;
      if (!principal) {
        throw new FmsError(
          401,
          'https://fms.local/errors/unauthorized',
          'Missing or invalid credential',
        );
      }
      const role = await auth.requireProjectRole(principal, projectId);
      if (role === 'product-owner') {
        // Capability matrix (FR-59): product owners may not create environments.
        throw new FmsError(
          403,
          'https://fms.local/errors/forbidden',
          'Product owners cannot create environments',
        );
      }
      const body = request.body as { env?: string };
      const problems = validateEnvName(body.env);
      if (problems.length > 0) {
        throw validationError('Invalid environment name', problems);
      }
      const outcome = await store.createEnvironment(
        projectId,
        body.env ?? '',
        actorName(principal),
      );
      if (outcome === 'conflict') {
        throw new FmsError(
          409,
          'https://fms.local/errors/conflict',
          `Environment '${body.env}' already exists in this project`,
        );
      }
      return reply.code(201).send({ projectId, env: body.env });
    },
  );

  app.get('/api/v1/projects/:projectId/members', async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const members = await store.listMembers(
      paramValue(paramsOf(request), 'projectId'),
    );
    return { members };
  });

  app.post('/api/v1/projects/:projectId/members', async (request, reply) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const body = request.body as {
      username?: string;
      role?: string;
      projects?: Array<{ projectId?: string; role?: string }>;
    };
    const assignments = (body.projects ?? [])
      .map((assignment) => ({
        projectId: assignment.projectId ?? '',
        role: assignment.role ?? '',
      }))
      .filter(
        (assignment) =>
          assignment.projectId.length > 0 && assignment.role.length > 0,
      )
      .map((assignment) => ({
        projectId: assignment.projectId,
        role: assignment.role as 'admin' | 'developer' | 'product-owner',
      }));
    const validRoles: Array<'admin' | 'developer' | 'product-owner'> = [
      'admin',
      'developer',
      'product-owner',
    ];
    const invalidAssignment = assignments.find(
      (assignment) => !validRoles.includes(assignment.role),
    );
    if (
      !body.username ||
      !body.role ||
      assignments.length === 0 ||
      invalidAssignment
    ) {
      throw new FmsError(
        400,
        'https://fms.local/errors/validation',
        'username, role and projects[] (projectId + role) with a valid role are required',
      );
    }
    const invited = await store.inviteMember({
      username: body.username,
      globalRole: body.role as 'admin' | 'developer' | 'product-owner',
      assignments,
      actor: actorName(principal),
    });
    return reply.code(201).send({
      user: invited.user,
      role: body.role,
      projects: invited.memberships.map((m) => ({
        projectId: m.projectId,
        role: m.role as 'admin' | 'developer' | 'product-owner',
      })),
      password: invited.tempPassword,
    });
  });

  // ---------------------------------------------------------------- flags

  app.get('/api/v1/projects/:projectId/flags', async (request) => {
    const projectId = paramValue(paramsOf(request), 'projectId');
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    await auth.requireProjectRole(principal, projectId);
    const flags = await store.listFlags(projectId);
    return { flags };
  });

  app.post('/api/v1/projects/:projectId/flags', async (request, reply) => {
    const projectId = paramValue(paramsOf(request), 'projectId');
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const role = await auth.requireProjectRole(principal, projectId);
    if (role === 'product-owner') {
      // Capability matrix (FR-59): product owners cannot create flags.
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Product owners cannot create flags',
      );
    }
    const body = request.body as { key?: string; description?: string };
    const keyProblems = validateFlagKey(body.key);
    if (keyProblems.length > 0) {
      throw validationError('Invalid flag key', keyProblems);
    }
    const outcome = await store.createFlag({
      projectId,
      key: body.key ?? '',
      description: body.description ?? '',
      actor: actorName(principal),
    });
    if (outcome === 'conflict') {
      throw new FmsError(
        409,
        'https://fms.local/errors/conflict',
        `Flag key '${body.key}' already exists in this project`,
      );
    }
    const flag = await store.getFlag(projectId, body.key ?? '');
    return reply.code(201).send(flag);
  });

  app.get('/api/v1/projects/:projectId/flags/:key', async (request) => {
    const projectId = paramValue(paramsOf(request), 'projectId');
    const key = paramValue(paramsOf(request), 'key');
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    await auth.requireProjectRole(principal, projectId);
    const flag = await store.getFlag(projectId, key);
    if (!flag) {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        `Flag '${key}' not found`,
      );
    }
    return flag;
  });

  app.put('/api/v1/projects/:projectId/flags/:key', async (request) => {
    const projectId = paramValue(paramsOf(request), 'projectId');
    const key = paramValue(paramsOf(request), 'key');
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const role = await auth.requireProjectRole(principal, projectId);
    if (role === 'product-owner') {
      // Capability matrix (FR-59): product owners cannot edit descriptions.
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Product owners cannot edit flag descriptions',
      );
    }
    const body = request.body as { description?: string };
    const outcome = await store.updateFlagDescription(
      projectId,
      key,
      body.description ?? '',
      actorName(principal),
    );
    if (outcome === 'not_found') {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        `Flag '${key}' not found`,
      );
    }
    const flag = await store.getFlag(projectId, key);
    return flag;
  });

  app.delete(
    '/api/v1/projects/:projectId/flags/:key',
    async (request, reply) => {
      const projectId = paramValue(paramsOf(request), 'projectId');
      const key = paramValue(paramsOf(request), 'key');
      const principal = request.principal;
      if (!principal) {
        throw new FmsError(
          401,
          'https://fms.local/errors/unauthorized',
          'Missing or invalid credential',
        );
      }
      const role = await auth.requireProjectRole(principal, projectId);
      if (!isFullAccess(role)) {
        // Capability matrix (FR-54/FR-59): only a (project-scoped) admin may delete flags.
        throw new FmsError(
          403,
          'https://fms.local/errors/forbidden',
          'Admin capability required',
        );
      }
      const existing = await store.getFlag(projectId, key);
      const projectKey = await store.getProjectKeyById(projectId);
      const outcome = await store.deleteFlag(
        projectId,
        key,
        actorName(principal),
      );
      if (outcome === 'not_found') {
        throw new FmsError(
          404,
          'https://fms.local/errors/not-found',
          `Flag '${key}' not found`,
        );
      }
      if (existing) {
        for (const env of Object.keys(existing.definitions)) {
          enqueueFlagChange(
            broadcaster,
            `${projectKey ?? ''}:${env}`,
            key,
            existing.version,
          );
        }
      }
      return reply.code(204).send();
    },
  );

  app.put(
    '/api/v1/projects/:projectId/flags/:key/definitions/:env',
    async (request) => {
      const projectId = paramValue(paramsOf(request), 'projectId');
      const key = paramValue(paramsOf(request), 'key');
      const env = paramValue(paramsOf(request), 'env');
      const principal = request.principal;
      if (!principal) {
        throw new FmsError(
          401,
          'https://fms.local/errors/unauthorized',
          'Missing or invalid credential',
        );
      }
      const role = await auth.requireProjectRole(principal, projectId);
      const body = request.body as FlagDefinitionInput;
      const problems = validateDefinition(body);
      if (problems.length > 0) {
        throw validationError('Invalid definition', problems);
      }
      if (role === 'product-owner') {
        // Capability matrix (FR-59): product owners may only toggle `enabled`.
        const storedFlag = await store.getFlag(projectId, key);
        if (!storedFlag) {
          throw new FmsError(
            404,
            'https://fms.local/errors/not-found',
            `Flag '${key}' not found`,
          );
        }
        if (!productOwnerPutAllowed(storedFlag.definitions[env], body)) {
          throw new FmsError(
            403,
            'https://fms.local/errors/forbidden',
            'Product owners may only change enabled',
          );
        }
      }
      const projectKey = await store.getProjectKeyById(projectId);
      const result: PutDefinitionResult = await store.putDefinition({
        projectId,
        flagKey: key,
        env,
        definition: {
          enabled: body.enabled,
          variants: body.variants,
          defaultVariant: body.defaultVariant,
          rules: body.rules,
        },
        actor: actorName(principal),
      });
      if (!result.found) {
        throw new FmsError(
          404,
          'https://fms.local/errors/not-found',
          `Flag '${key}' not found`,
        );
      }
      if (!result.unchanged) {
        // Only a genuinely changed definition queues a change event (idempotent puts are no-ops).
        enqueueFlagChange(
          broadcaster,
          `${projectKey ?? ''}:${env}`,
          key,
          result.version,
        );
      }
      return {
        flagKey: result.flagKey,
        env: result.env,
        version: result.version,
      };
    },
  );

  app.post(
    '/api/v1/projects/:projectId/flags/:key/definitions/:env/copy',
    async (request) => {
      const projectId = paramValue(paramsOf(request), 'projectId');
      const key = paramValue(paramsOf(request), 'key');
      const env = paramValue(paramsOf(request), 'env');
      const principal = request.principal;
      if (!principal) {
        throw new FmsError(
          401,
          'https://fms.local/errors/unauthorized',
          'Missing or invalid credential',
        );
      }
      const role = await auth.requireProjectRole(principal, projectId);
      if (role === 'product-owner') {
        // Capability matrix (FR-59): product owners cannot copy definitions.
        throw new FmsError(
          403,
          'https://fms.local/errors/forbidden',
          'Product owners cannot copy definitions',
        );
      }
      const body = request.body as { fromEnv?: string };
      if (!body.fromEnv) {
        throw new FmsError(
          400,
          'https://fms.local/errors/validation',
          'fromEnv is required',
        );
      }
      if (body.fromEnv === env) {
        throw new FmsError(
          400,
          'https://fms.local/errors/validation',
          'fromEnv must differ from env',
        );
      }
      const projectKey = await store.getProjectKeyById(projectId);
      const flag = await store.getFlag(projectId, key);
      const outcome = await store.copyDefinition({
        projectId,
        flagKey: key,
        env,
        fromEnv: body.fromEnv,
        actor: actorName(principal),
      });
      if (outcome === 'not_found') {
        throw new FmsError(
          404,
          'https://fms.local/errors/not-found',
          `Source environment '${body.fromEnv}' has no definition for flag '${key}'`,
        );
      }
      // copyDefinition bumps the flag version; the change is queued synchronously (no await between write and queue).
      const version = (flag?.version ?? 0) + 1;
      enqueueFlagChange(
        broadcaster,
        `${projectKey ?? ''}:${env}`,
        key,
        version,
      );
      return { flagKey: key, env, version };
    },
  );

  // ---------------------------------------------------------------- sync (flagd source)

  app.get('/api/v1/sync/:projectKey/:env', async (request, reply) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    if (principal.type === 'api_key' && !(await auth.canSync(principal))) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Sync scope required',
      );
    }
    const params = paramsOf(request);
    const projectKey = paramValue(params, 'projectKey');
    const env = paramValue(params, 'env');
    const project = await store.getProject(projectKey);
    if (!project) {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        `Project '${projectKey}' not found`,
      );
    }
    if (
      principal.type === 'session' &&
      !(await auth.canSync(principal, project.id))
    ) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Sync access required for this project',
      );
    }
    if (!project.environments.includes(env)) {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        `Environment '${env}' not found in project '${projectKey}'`,
      );
    }
    const flags = await store.listFlagdModelInputs(project.id, env);
    const compiled = memo.get({
      projectId: project.id,
      env,
      flagSetId: `${project.key}:${env}`,
      flags,
    });
    if (ifNoneMatchMatches(request.headers['if-none-match'], compiled.etag)) {
      reply.header('ETag', compiled.etag);
      return reply.code(304).send();
    }
    reply.header('ETag', compiled.etag);
    return reply.code(200).type('application/json').send(compiled.body);
  });

  // ---------------------------------------------------------------- events (SSE, ADR-0008)

  app.get('/api/v1/events', async (request, reply) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    if (!(await auth.canEvaluate(principal))) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Evaluate scope required',
      );
    }
    const query = queryOf(request);
    const envs = String(query.envs ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const flagSets = await store.listFlagSets();
    const knownFlagSetIds = new Set(
      flagSets.map((flagSet) => flagSet.flagSetId),
    );
    for (const env of envs) {
      if (!knownFlagSetIds.has(env)) {
        throw new FmsError(
          400,
          'https://fms.local/errors/validation',
          `Unknown flag set id '${env}'`,
        );
      }
    }
    // `?envs=` selects one or more flag sets (comma-separated); without a selection the
    // stream covers every known flag set. After `reply.hijack()` the response headers are
    // written through the raw socket (Fastify stops managing the response afterwards).
    const flagSetIds = envs.length > 0 ? envs : undefined;
    await reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const stream = startFlagChangeStream({
      broadcaster,
      registry,
      reply,
      flagSetIds,
    });
    reply.raw.once('close', stream.close);
    return reply;
  });

  // ---------------------------------------------------------------- evaluate / observed

  app.post('/api/v1/evaluate', async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    if (!(await auth.canEvaluate(principal))) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Evaluate scope required',
      );
    }
    const body = request.body as {
      projectKey?: string;
      flagKey?: string;
      environment?: string;
      targetingKey?: string;
      context?: unknown;
    };
    const problems: ValidationProblem[] = [];
    if (typeof body.projectKey !== 'string' || body.projectKey.length < 1) {
      problems.push({
        pointer: '/projectKey',
        message: 'projectKey is required',
      });
    }
    if (typeof body.flagKey !== 'string' || body.flagKey.length < 1) {
      problems.push({ pointer: '/flagKey', message: 'flagKey is required' });
    }
    if (typeof body.environment !== 'string' || body.environment.length < 1) {
      problems.push({
        pointer: '/environment',
        message: 'environment is required',
      });
    }
    if (
      body.targetingKey !== undefined &&
      typeof body.targetingKey !== 'string'
    ) {
      problems.push({
        pointer: '/targetingKey',
        message: 'targetingKey must be a string',
      });
    }
    if (
      body.context !== undefined &&
      (typeof body.context !== 'object' ||
        body.context === null ||
        Array.isArray(body.context))
    ) {
      problems.push({
        pointer: '/context',
        message: 'context must be an object',
      });
    }
    if (problems.length > 0) {
      throw validationError('Invalid evaluate request', problems);
    }
    const projectKey = body.projectKey as string;
    const flagKey = body.flagKey as string;
    const environment = body.environment as string;
    const project = await store.getProject(projectKey);
    if (!project) {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        `Project '${projectKey}' not found`,
      );
    }
    if (!project.environments.includes(environment)) {
      throw new FmsError(
        400,
        'https://fms.local/errors/validation',
        `Environment '${environment}' is not an environment of project '${projectKey}'`,
      );
    }
    const flag = await store.getFlag(project.id, flagKey);
    const definition = flag?.definitions[environment];
    if (!flag || !definition) {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        `Flag '${flagKey}' not found in environment '${environment}'`,
      );
    }
    const result = await evaluator.resolve({
      flagSetId: `${project.key}:${environment}`,
      flagKey,
      enabled: definition.enabled,
      variants: definition.variants,
      defaultVariant: definition.defaultVariant,
      variantType: variantTypeOfVariants(definition.variants),
      version: flag.version,
      targetingKey: body.targetingKey,
      context: body.context as Record<string, unknown> | undefined,
    });
    return {
      value: result.value,
      variant: result.variant,
      reason: result.reason,
      flagVersion: result.flagVersion,
    };
  });

  app.get(
    '/api/v1/projects/:projectId/flags/:key/observed',
    async (request) => {
      const projectId = paramValue(paramsOf(request), 'projectId');
      const key = paramValue(paramsOf(request), 'key');
      const principal = request.principal;
      if (!principal) {
        throw new FmsError(
          401,
          'https://fms.local/errors/unauthorized',
          'Missing or invalid credential',
        );
      }
      if (!(await auth.canEvaluate(principal, projectId))) {
        throw new FmsError(
          403,
          'https://fms.local/errors/forbidden',
          'Evaluate scope required',
        );
      }
      const flag = await store.getFlag(projectId, key);
      if (!flag) {
        throw new FmsError(
          404,
          'https://fms.local/errors/not-found',
          `Flag '${key}' not found`,
        );
      }
      const projectKey = await store.getProjectKeyById(projectId);
      const observed: Record<
        string,
        { version: number; enabled: boolean; variantType: string }
      > = {};
      for (const [env, definition] of Object.entries(flag.definitions)) {
        const result = await evaluator.resolve({
          flagSetId: `${projectKey ?? ''}:${env}`,
          flagKey: key,
          enabled: definition.enabled,
          variants: definition.variants,
          defaultVariant: definition.defaultVariant,
          variantType: variantTypeOfVariants(definition.variants),
          version: flag.version,
          context: {},
        });
        observed[env] = {
          version: result.flagVersion,
          enabled: result.reason !== 'DISABLED',
          variantType: variantTypeOfVariants(definition.variants),
        };
      }
      return { key, observed };
    },
  );

  // ---------------------------------------------------------------- audit / keys / openapi

  app.get('/api/v1/audit', async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const query = {
      limit: Math.min(
        Math.max(parseInt(String(queryOf(request).limit ?? '50'), 10) || 50, 1),
        200,
      ),
      before: (queryOf(request).before as string) ?? null,
      action: (queryOf(request).action as string) ?? null,
      entity: (queryOf(request).entity as string) ?? null,
      actor: (queryOf(request).actor as string) ?? null,
    };
    const page: AuditPage = await store.listAudit(query);
    return page;
  });

  app.get('/api/v1/api-keys', async (request) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const keys = await store.listApiKeys();
    return { keys };
  });

  app.post('/api/v1/api-keys', async (request, reply) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const body = request.body as { name?: string; scope?: string };
    if (!body.name || !body.scope) {
      throw new FmsError(
        400,
        'https://fms.local/errors/validation',
        'name and scope are required',
      );
    }
    const { key, plaintext } = await store.createApiKey({
      name: body.name,
      scope: body.scope as 'manage' | 'evaluate' | 'sync' | 'all',
      createdBy: actorName(principal),
    });
    return reply.code(201).send({
      id: key.id,
      name: key.name,
      scope: key.scope,
      key: plaintext,
      createdAt: key.createdAt,
    });
  });

  app.delete('/api/v1/api-keys/:id', async (request, reply) => {
    const principal = request.principal;
    if (!principal) {
      throw new FmsError(
        401,
        'https://fms.local/errors/unauthorized',
        'Missing or invalid credential',
      );
    }
    const admin = await auth.isAdmin(principal);
    if (!admin) {
      throw new FmsError(
        403,
        'https://fms.local/errors/forbidden',
        'Admin capability required',
      );
    }
    const outcome = await store.revokeApiKey(
      String(paramValue(paramsOf(request), 'id')),
      actorName(principal),
    );
    if (outcome === 'not_found') {
      throw new FmsError(
        404,
        'https://fms.local/errors/not-found',
        'API key not found',
      );
    }
    return reply.code(204).send();
  });

  app.get('/api/v1/openapi.json', async () => {
    const { readFileSync } = await import('node:fs');
    const path = await import('node:path');
    const openApi = JSON.parse(
      readFileSync(path.resolve(process.cwd(), 'server/openapi.json'), 'utf8'),
    );
    return openApi;
  });
}
