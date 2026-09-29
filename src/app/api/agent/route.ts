import { NextResponse } from 'next/server';
import { AgentQuestionSchema, runToolLoop } from '@/services/coordinator-agent';
import { requireCoordinatorAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = requireCoordinatorAuth(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({
    ok: true,
    name: 'Coordinator AI Assistant',
    capabilities: [
      'get_patient',
      'search_patients',
      'get_patient_timeline',
      'recall_patient_memory',
      'reflect_patient_memory',
      'get_protocol_rules',
      'evaluate_protocol_compliance',
      'get_alert_history',
      'get_coordinator_reviews',
      'record_coordinator_review',
    ],
  });
}

export async function POST(request: Request) {
  const unauthorized = requireCoordinatorAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const parsed = AgentQuestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await runToolLoop(parsed.data.question, parsed.data.trialId);

    return NextResponse.json(
      {
        success: result.ok,
        answer: result.answer,
        evidence: result.evidence,
        toolCalls: result.toolCalls,
        patientId: result.patientId,
      },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error) {
    console.error('[API /api/agent] Processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to answer coordinator question.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
