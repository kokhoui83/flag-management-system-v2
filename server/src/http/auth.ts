import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { type ApiKeyRecord, type Store } from '../store';
import { FmsError, unauthorizedError } from './problem';
import { effectiveCapability, hasProjectAccess, isFullAccess, type EffectiveRole } from '../domain/types';

export const COOKIE_NAME = 'fms_token';
const JWT_TTL_SECONDS = 12 * 60 * 60;

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}

export type Principal =
  | { type: 'session'; session: SessionContext }
  | { type: 'api_key'; apiKey: ApiKeyRecord };

export interface SessionContext {
  username: string;
  globalRole: string;
  isBootstrapAdmin: boolean;
}

export interface AuthService {
  /** Resolves the credential on the request (Bearer or `fms_token` cookie) → principal; throws 401 problem+json. */
  resolve(request: FastifyRequest): Promise<Principal>;
  /** Verifies bootstrap-admin credentials (FR-30) → full-access session context, or null. */
  verifyBootstrap(username: string, password: string): Promise<SessionContext | null>;
  /** Verifies an invited user via their argon2id temp-password hash (FR-57/FR-31). */
  verifyUser(username: string, password: string): Promise<SessionContext | null>;
  /** Issues a signed session token (JWT, HS256, 12 h) for a session context. */
  issue(context: SessionContext, secret: string): string;
  /** True when the principal holds full admin capability (bootstrap admin, invited global admin, manage key). */
  isAdmin(principal: Principal): Promise<boolean>;
  /** Effective role of the caller on a project (FR-53/FR-54); throws 403 when none. */
  requireProjectRole(principal: Principal, projectId: string): Promise<EffectiveRole>;
  /** True when the principal may fetch a project's flagd model (FR-27). */
  canSync(principal: Principal, projectId?: string): Promise<boolean>;
}

export function createAuthService(deps: {
  store: Store;
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
}): AuthService {
  const { store, adminUsername, adminPassword, jwtSecret } = deps;

  function signJwt(payload: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  function verifyJwtUsername(token: string): string | null {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = parts[0];
    const body = parts[1];
    const signature = parts[2];
    if (!header || !body || !signature) return null;
    const expected = createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub?: string;
      type?: string;
      exp?: number;
    };
    if (payload.type !== 'session' || typeof payload.sub !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
    return payload.sub;
  }

  function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }

  async function authenticate(credential: string | undefined): Promise<Principal> {
    if (!credential) {
      throw unauthorizedError();
    }
    if (credential.startsWith('fms_')) {
      const apiKey = await store.findApiKeyByHash(createHash('sha256').update(credential).digest('hex'));
      if (!apiKey || apiKey.revokedAt !== null) {
        throw unauthorizedError('API key is unknown or revoked');
      }
      return { type: 'api_key', apiKey };
    }
    const username = verifyJwtUsername(credential);
    if (!username) {
      throw unauthorizedError();
    }
    const session =
      username === adminUsername
        ? { username, globalRole: 'admin', isBootstrapAdmin: true }
        : await storeUserSession(username);
    if (!session) {
      throw unauthorizedError();
    }
    return { type: 'session', session };
  }

  async function storeUserSession(username: string): Promise<SessionContext | null> {
    const user = await store.findUserByName(username);
    if (!user) return null;
    return { username, globalRole: user.globalRole, isBootstrapAdmin: false };
  }

  async function resolve(request: FastifyRequest): Promise<Principal> {
    const auth = request.headers.authorization;
    let credential: string | undefined;
    if (auth?.startsWith('Bearer ')) {
      credential = auth.slice('Bearer '.length).trim();
    } else {
      const cookie = request.cookies?.[COOKIE_NAME];
      if (cookie) credential = cookie;
    }
    const principal = await authenticate(credential);
    request.principal = principal;
    return principal;
  }

  async function verifyBootstrap(username: string, password: string): Promise<SessionContext | null> {
    if (username !== adminUsername) return null;
    if (!safeEqual(password, adminPassword)) return null;
    return { username, globalRole: 'admin', isBootstrapAdmin: true };
  }

  async function verifyUser(username: string, password: string): Promise<SessionContext | null> {
    const user = await store.findUserByName(username);
    if (!user) return null;
    const ok = await store.verifyUserPassword(username, password);
    if (!ok) return null;
    return { username, globalRole: user.globalRole, isBootstrapAdmin: false };
  }

  function issue(context: SessionContext, secret: string): string {
    const now = Math.floor(Date.now() / 1000);
    const token = signJwt({
      sub: context.username,
      type: 'session',
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    });
    void secret;
    return token;
  }

  async function isAdmin(principal: Principal): Promise<boolean> {
    if (principal.type === 'api_key') {
      const principalScope = principal.apiKey.scope.toUpperCase();
      return principalScope === 'MANAGE' || principalScope === 'ALL';
    }
    if (principal.session.isBootstrapAdmin) return true;
    const user = await store.findUserByName(principal.session.username);
    return user?.globalRole?.toUpperCase() === 'ADMIN';
  }

  async function requireProjectRole(principal: Principal, projectId: string): Promise<EffectiveRole> {
    if (principal.type === 'api_key') {
      const principalScope = principal.apiKey.scope.toUpperCase();
      const apiAdmin = principalScope === 'MANAGE' || principalScope === 'ALL';
      if (!apiAdmin) {
        throw new FmsError(403, 'https://fms.local/errors/forbidden', 'Insufficient scope for this project operation');
      }
      return 'admin';
    }
    const session = principal.session;
    if (session.isBootstrapAdmin) return 'admin';
    const user = await store.findUserByName(session.username);
    const membership = user ? await store.findMembership(session.username, projectId) : null;
    // Effective permissions are the union of the global role and the per-project
    // membership (FR-54): a membership may elevate on this project, never below global.
    const role = effectiveCapability(user?.globalRole, membership?.role);
    if (!hasProjectAccess(role)) {
      throw new FmsError(403, 'https://fms.local/errors/forbidden', 'No access to this project');
    }
    return role;
  }

  async function canSync(principal: Principal, projectId?: string): Promise<boolean> {
    if (principal.type === 'api_key') {
      const scope = principal.apiKey.scope.toUpperCase();
      return scope === 'SYNC' || scope === 'ALL';
    }
    if (principal.session.isBootstrapAdmin) return true;
    const user = await store.findUserByName(principal.session.username);
    if (user?.globalRole?.toUpperCase() === 'ADMIN') return true;
    if (projectId) {
      const membership = await store.findMembership(principal.session.username, projectId);
      // The flagd sync source is admin-gated: global admin or a project-scoped admin via elevation.
      return isFullAccess(effectiveCapability(user?.globalRole, membership?.role));
    }
    const assignments = await store.listMemberAssignments(principal.session.username);
    return assignments.some((assignment) => assignment.role?.toUpperCase() === 'ADMIN');
  }

  return {
    resolve,
    verifyBootstrap,
    verifyUser,
    issue,
    isAdmin,
    requireProjectRole,
    canSync,
  };
}
