/**
 * GET  /api/compliance/[logId]/review
 *   Returns full compliance log details for coordinator review.
 *
 * POST /api/compliance/[logId]/override
 *   Submits a coordinator review action (APPROVE / OVERRIDE / ESCALATE / DISMISS).
 *
 * Note: Both operations live in the same dynamic segment so we define GET here
 * and POST in the sibling override/route.ts. Next.js App Router requires separate
 * files per leaf; we keep GET here as the "review" view endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getComplianceLogForReview } from '@/services/feedback-service';
import { requireCoordinatorAuth } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const unauthorized = requireCoordinatorAuth(_req);
  if (unauthorized) return unauthorized;

  const { logId } = await params;

  try {
    const log = await getComplianceLogForReview(logId);

    if (!log) {
      return NextResponse.json(
        { ok: false, error: `ComplianceLog not found: ${logId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, log });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error(`[GET /api/compliance/${logId}/review]`, error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
