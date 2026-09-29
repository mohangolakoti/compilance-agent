import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

function configuredToken(): string | undefined {
  return process.env.COORDINATOR_API_TOKEN?.trim() || undefined;
}

function providedToken(request: Request): string | undefined {
  const bearer = request.headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    return bearer.slice('Bearer '.length).trim();
  }
  return request.headers.get('x-coordinator-token')?.trim() || undefined;
}

function tokensMatch(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function requireCoordinatorAuth(request: Request): NextResponse | null {
  const expected = configuredToken();
  const actual = providedToken(request);

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (!expected && !isProduction) {
    return null;
  }

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'Coordinator authentication is not configured.' },
      { status: 503 }
    );
  }

  if (!actual || !tokensMatch(expected, actual)) {
    return NextResponse.json(
      { ok: false, error: 'Coordinator authentication required.' },
      { status: 401 }
    );
  }

  return null;
}
