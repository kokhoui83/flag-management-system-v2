import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from './client';

function respond(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  });
}

describe('api client transport', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastRequest(): { url: string; init: RequestInit } {
    const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
    return { url: String(url), init: init ?? {} };
  }

  it('declares a JSON content type only when it sends a body', async () => {
    fetchMock.mockResolvedValue(respond(204));

    await api.revokeApiKey('key-1');

    const { url, init } = lastRequest();
    expect(url).toBe('/api/v1/api-keys/key-1');
    expect(init.method).toBe('DELETE');
    expect(init.headers).not.toHaveProperty('content-type');
  });

  it('sends logout without a body or content type', async () => {
    fetchMock.mockResolvedValue(respond(200));

    await api.logout();

    const { init } = lastRequest();
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty('content-type');
  });

  it('sends JSON bodies with the JSON content type and the session cookie', async () => {
    fetchMock.mockResolvedValue(respond(201, { projectId: 'p1', env: 'qa' }));

    await api.createEnvironment('p1', 'qa');

    const { url, init } = lastRequest();
    expect(url).toBe('/api/v1/projects/p1/environments');
    expect(init.body).toBe(JSON.stringify({ env: 'qa' }));
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(init.credentials).toBe('same-origin');
  });

  it('addresses an invite to the first assigned project and carries every assignment', async () => {
    fetchMock.mockResolvedValue(
      respond(201, {
        user: 'jane',
        role: 'developer',
        projects: [],
        password: 'temp',
      }),
    );
    const invite = {
      username: 'jane',
      role: 'developer',
      projects: [
        { projectId: 'p1', role: 'developer' },
        { projectId: 'p2', role: 'admin' },
      ],
    };

    await api.inviteMember(invite);

    const { url, init } = lastRequest();
    expect(url).toBe('/api/v1/projects/p1/members');
    expect(init.body).toBe(JSON.stringify(invite));
  });

  it('turns a problem document into an ApiError carrying its detail and problems', async () => {
    fetchMock.mockResolvedValue(
      respond(400, {
        type: 'https://fms.local/errors/validation',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid definition',
        errors: [{ pointer: '/defaultVariant', message: 'unknown variant' }],
      }),
    );

    const failure = await api.listFlags('p1').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(400);
    expect((failure as ApiError).message).toBe('Invalid definition');
    expect((failure as ApiError).problem?.errors).toHaveLength(1);
  });
});
