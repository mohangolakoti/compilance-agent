/**
 * GET /api/compliance/pending
 *
 * Returns all compliance logs that require coordinator action and have not yet
 * been reviewed, optionally filtered by trialId.
 *
 * Query params:
 *   trialId  (optional) — filter to a specific trial
 *   limit    (optional) — max records, default 50
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPendingCoordinatorReviews } from '@/services/feedback-service';
import { requireCoordinatorAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const unauthorized = requireCoordinatorAuth(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const trialId = searchParams.get('trialId') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;

    const pending = await getPendingCoordinatorReviews(trialId, limit);

    return NextResponse.json({
      ok: true,
      count: pending.length,
      pending,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[GET /api/compliance/pending]', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
