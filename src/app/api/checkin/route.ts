import { NextResponse } from 'next/server';
import { processPatientCheckIn } from '@/services/checkin-pipeline';
import { requireCoordinatorAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const unauthorized = requireCoordinatorAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { patientId, trialId, rawResponse, dayNumber, channel } = body;

    if (!patientId || !trialId || !rawResponse || dayNumber === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: patientId, trialId, rawResponse, and dayNumber are required.',
        },
        { status: 400 }
      );
    }

    const result = await processPatientCheckIn({
      patientId,
      trialId,
      rawResponse,
      dayNumber: Number(dayNumber),
      channel: channel ?? 'WEB_FORM',
    });

    return NextResponse.json(
      {
        success: true,
        checkInId: result.checkIn.checkInId,
        logId: result.complianceLog.logId,
        patientId,
        trialId,
        dayNumber,
        overallStatus: result.evaluation.overallStatus,
        requiresCoordinatorAction: result.evaluation.requiresCoordinatorAction,
        violations: result.evaluation.violations,
        extraction: result.extraction,
        hindsight: result.hindsight,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API /api/checkin] Processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process patient check-in.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
