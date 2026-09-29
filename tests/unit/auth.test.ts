import { requireCoordinatorAuth } from '@/lib/auth';

describe('Coordinator API authentication', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalToken = process.env.COORDINATOR_API_TOKEN;
  const originalVercel = process.env.VERCEL;

  function setNodeEnv(value: string) {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    if (originalToken === undefined) {
      delete process.env.COORDINATOR_API_TOKEN;
    } else {
      process.env.COORDINATOR_API_TOKEN = originalToken;
    }
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  test('fails closed in production when no token is configured', async () => {
    setNodeEnv('production');
    process.env.VERCEL = '1';
    delete process.env.COORDINATOR_API_TOKEN;

    const response = requireCoordinatorAuth(new Request('http://localhost/api/agent'));

    expect(response?.status).toBe(503);
  });

  test('rejects an invalid coordinator token', () => {
    setNodeEnv('production');
    process.env.COORDINATOR_API_TOKEN = 'expected-token';

    const response = requireCoordinatorAuth(new Request('http://localhost/api/agent', {
      headers: { 'x-coordinator-token': 'wrong-token' },
    }));

    expect(response?.status).toBe(401);
  });

  test('accepts a valid bearer token', () => {
    setNodeEnv('production');
    process.env.COORDINATOR_API_TOKEN = 'expected-token';

    const response = requireCoordinatorAuth(new Request('http://localhost/api/agent', {
      headers: { authorization: 'Bearer expected-token' },
    }));

    expect(response).toBeNull();
  });
});
