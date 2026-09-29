import {
  extractProtocolTextFromPdf,
  extractProtocolRulesFromText,
  reviewProtocolRule,
} from '@/services/protocol-ingestion';

describe('Phase 8 — Protocol Ingestion', () => {
  test('extracts and validates protocol rules from synthetic protocol text', () => {
    const text = `
      Protocol CT-2026-X Overview
      Dosing window: Dose must be taken within 120 minutes of 08:00 AM.
      Missed dose: If patient misses one dose, coordinator review required.
      Prohibited medications: Ibuprofen, naproxen, and aspirin are prohibited.
      Adverse event threshold: Grade 3 vomiting or fever requires expedited review.
      Visit schedule: Patients must complete clinic check-in every 7 days.
    `;

    const result = extractProtocolRulesFromText(text, 'CT-2026-X');

    expect(result.candidates.length).toBeGreaterThanOrEqual(5);
    expect(result.candidates.some((rule) => rule.category === 'DOSING_TIMING')).toBe(true);
    expect(result.candidates.some((rule) => rule.category === 'DOSING_AMOUNT')).toBe(true);
    expect(result.candidates.some((rule) => rule.category === 'PROHIBITED_MEDICATION')).toBe(true);
    expect(result.candidates.some((rule) => rule.category === 'ADVERSE_EVENT_GRADE')).toBe(true);
    expect(result.candidates.every((rule) => rule.name.length > 0)).toBe(true);
  });

  test('rejects invalid or empty PDF input', async () => {
    await expect(extractProtocolTextFromPdf(new File([''], 'invalid.txt', { type: 'text/plain' }))).rejects.toThrow(/PDF|application\/pdf/i);

    await expect(extractProtocolTextFromPdf('')).rejects.toThrow(/text/i);
  });

  test('handles malformed extracted rule payloads safely', () => {
    const malformed = {
      bad: 'payload',
    };

    const parsed = reviewProtocolRule({
      trialId: 'CT-2026-X',
      decision: 'APPROVE',
      coordinatorId: 'C-1001',
      candidate: malformed as unknown as Record<string, unknown>,
    });

    expect(parsed.ok).toBe(false);
    expect(parsed.error).toMatch(/invalid|rule/i);
  });

  test('approves a valid candidate and preserves required fields', () => {
    const candidate = {
      ruleId: 'RULE-TRIAL-120',
      category: 'DOSING_TIMING',
      name: 'Dose Timing Window',
      description: 'Dose must be within 120 minutes of target time.',
      severity: 'MEDIUM',
      parameters: { maxAllowedWindowMinutes: 120 },
      sourcePage: 'Section 4.2',
      sourceReference: 'Protocol Appendix A',
      threshold: '120 minutes',
      timeWindow: 'Daily dosing window',
      requiredAction: 'Review any patient dose beyond 2 hours',
      status: 'PENDING',
    };

    const review = reviewProtocolRule({
      trialId: 'CT-2026-X',
      decision: 'APPROVE',
      coordinatorId: 'C-1001',
      candidate,
    });

    expect(review.ok).toBe(true);
    expect(review.data?.status).toBe('APPROVED');
    expect(review.data?.sourcePage).toBe('Section 4.2');
    expect(review.data?.requiredAction).toContain('Review');
  });
});
