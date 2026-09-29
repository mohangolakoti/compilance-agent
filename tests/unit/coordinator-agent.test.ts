import {
  answerCoordinatorQuestion,
  getPatient,
  getPatientTimeline,
  evaluateProtocolCompliance,
} from '@/services/coordinator-agent';

describe('Phase 10 — Coordinator Agent', () => {
  test('retrieves a patient record by patient ID and trial ID', async () => {
    const patient = await getPatient('CT-2026-X', 'P1047');

    expect(patient).not.toBeNull();
    expect(patient?.patientId).toBe('P1047');
    expect(patient?.trialId).toBe('CT-2026-X');
  });

  test('retrieves a timeline for the patient', async () => {
    const timeline = await getPatientTimeline('CT-2026-X', 'P1047');

    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[0].patientId).toBe('P1047');
  });

  test('evaluates compliance against the active protocol rules', async () => {
    const evaluation = await evaluateProtocolCompliance('CT-2026-X', 'P1047');

    expect(evaluation).toMatchObject({
      patientId: 'P1047',
      trialId: 'CT-2026-X',
    });
    expect(Array.isArray(evaluation.violations)).toBe(true);
  });

  test('answers a coordinator question with evidence-backed context', async () => {
    const result = await answerCoordinatorQuestion('Why was P1047 flagged?', 'CT-2026-X');

    expect(result.ok).toBe(true);
    expect(result.answer).toMatch(/P1047|flagged|review/i);
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
  });
});
