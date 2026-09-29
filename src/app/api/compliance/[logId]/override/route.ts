/**
 * POST /api/compliance/[logId]/override
 *
 * Submit a coordinator review action for a specific compliance log.
 *
 * Request body (JSON):
 * {
 *   "action":          "APPROVE" | "OVERRIDE" | "ESCALATE" | "DISMISS",
 *   "coordinatorId":   "dr.smith@trial.org",
 *   "notes":           "Optional clinical rationale",
 *   "overrideStatus":  "COMPLIANT"          // required only when action === "OVERRIDE"
 *   "liftSafetyHold":  true                 // optional; removes safety_hold from patient
 * }
 *
 * Response (200):
 * {
 *   "ok": true,
 *   "result": { ...CoordinatorReviewResult }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitCoordinatorReview, CoordinatorActionSchema } from '@/services/feedback-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  const { logId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  // Inject logId from path parameter into body before validation
  const merged = { ...(body as Record<string, unknown>), logId };

  const parsed = CoordinatorActionSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Additional guard: OVERRIDE requires overrideStatus
  if (parsed.data.action === 'OVERRIDE' && !parsed.data.overrideStatus) {
    return NextResponse.json(
      { ok: false, error: 'overrideStatus is required when action is OVERRIDE.' },
      { status: 422 }
    );
  }

  try {
    const result = await submitCoordinatorReview(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error(`[POST /api/compliance/${logId}/override]`, error);

    // Return 409 Conflict if the log was already reviewed
    if (message.includes('already been reviewed')) {
      return NextResponse.json({ ok: false, error: message }, { status: 409 });
    }
    // 404 if log not found
    if (message.includes('not found')) {
      return NextResponse.json({ ok: false, error: message }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
