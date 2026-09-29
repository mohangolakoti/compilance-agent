import { NextResponse } from 'next/server';
import {
  approveProtocolRule,
  extractProtocolRulesFromText,
  extractProtocolTextFromPdf,
  reviewProtocolRule,
} from '@/services/protocol-ingestion';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trialId = searchParams.get('trialId') ?? 'CT-2026-X';
    const text = searchParams.get('text') ?? '';

    if (!text) {
      return NextResponse.json({
        success: true,
        trialId,
        candidates: [],
        message: 'No protocol text supplied. Use a POST request with text or a PDF file.',
      });
    }

    const result = extractProtocolRulesFromText(text, trialId);

    return NextResponse.json({
      success: true,
      trialId,
      candidates: result.candidates,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to parse protocol rule text.',
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action ?? 'extract';
    const trialId = body.trialId ?? 'CT-2026-X';
    const coordinatorId = body.coordinatorId ?? 'system';

    if (action === 'extract') {
      const text = typeof body.text === 'string' ? body.text : '';
      if (!text) {
        return NextResponse.json(
          {
            error: 'Protocol text is required for extraction.',
          },
          { status: 400 }
        );
      }

      const result = extractProtocolRulesFromText(text, trialId);
      return NextResponse.json({
        success: true,
        trialId,
        candidates: result.candidates,
      });
    }

    if (action === 'review') {
      const review = reviewProtocolRule({
        trialId,
        decision: body.decision ?? 'APPROVE',
        coordinatorId,
        candidate: body.candidate,
        notes: body.notes,
      });

      if (!review.ok) {
        return NextResponse.json(
          { success: false, error: review.error },
          { status: 400 }
        );
      }

      if (review.data?.status === 'APPROVED') {
        const saveResult = await approveProtocolRule({
          trialId,
          coordinatorId,
          candidate: review.data,
          notes: body.notes,
        });

        return NextResponse.json({
          success: true,
          decision: body.decision ?? 'APPROVE',
          review: review.data,
          saved: saveResult,
        });
      }

      return NextResponse.json({
        success: true,
        decision: body.decision ?? 'APPROVE',
        review: review.data,
      });
    }

    if (action === 'pdf') {
      const { file, text } = body;
      const finalText = file ? await extractProtocolTextFromPdf(file) : text ?? '';
      const extracted = extractProtocolRulesFromText(finalText, trialId);

      return NextResponse.json({
        success: true,
        trialId,
        candidates: extracted.candidates,
        sourceText: extracted.sourceText,
      });
    }

    return NextResponse.json({ error: 'Unsupported action type.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process protocol review request.',
      },
      { status: 500 }
    );
  }
}
