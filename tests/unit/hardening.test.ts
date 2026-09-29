import { withRetry, clampToolLoop, createFallbackResponse } from '@/services/hardening';

describe('Phase 13 — reliability hardening', () => {
  test('retries transient failures up to the bounded retry limit', async () => {
    let attempts = 0;

    const result = await withRetry(async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error('temporary');
      }
      return 'recovered';
    }, { retries: 3, delayMs: 0 });

    expect(result).toBe('recovered');
    expect(attempts).toBe(3);
  });

  test('caps tool execution at the safe iteration limit', () => {
    const limited = clampToolLoop(['get_patient', 'evaluate_protocol_compliance', 'get_alert_history', 'recall_patient_memory'], 3);

    expect(limited).toHaveLength(3);
    expect(limited).toEqual(['get_patient', 'evaluate_protocol_compliance', 'get_alert_history']);
  });

  test('creates a safe fallback response when the system cannot answer with full evidence', () => {
    const fallback = createFallbackResponse('P1047', 'CT-2026-X', 'temporary outage');

    expect(fallback.ok).toBe(false);
    expect(fallback.patientId).toBe('P1047');
    expect(fallback.answer).toMatch(/temporary outage|unable to complete/i);
  });
});
