import { processPatientCheckIn } from '@/services/checkin-pipeline';

describe('Phase 6 — Core Memory Pipeline Unit Tests', () => {
  const trialId = 'CT-TEST-6';
  const patientId = 'PATIENT-PIPE-1';

  test('processPatientCheckIn handles compliant check-in pipeline execution', async () => {
    const result = await processPatientCheckIn({
      patientId,
      trialId,
      rawResponse: 'Took dose at 8:15 AM with breakfast. Feeling great.',
      dayNumber: 1,
      channel: 'WEB_FORM',
    });

    expect(result.checkIn).toBeDefined();
    expect(result.extraction.doseTaken).toBe(true);
    expect(result.evaluation.overallStatus).toBe('COMPLIANT');
    expect(result.hindsight.retained).toBe(true);
    expect(result.complianceLog).toBeDefined();
  });

  test('processPatientCheckIn detects prohibited NSAID and flags SAFETY_VIOLATION', async () => {
    const result = await processPatientCheckIn({
      patientId,
      trialId,
      rawResponse: 'Took dose at 9:00 AM. Experienced headache and ingested Ibuprofen 400mg.',
      dayNumber: 2,
      channel: 'SMS',
    });

    expect(result.extraction.concomitantMedications.some((m) => m.name.toLowerCase().includes('ibuprofen'))).toBe(true);
    expect(result.evaluation.overallStatus).toBe('SAFETY_VIOLATION');
    expect(result.evaluation.requiresCoordinatorAction).toBe(true);
    expect(result.evaluation.violations.some((v) => v.category === 'PROHIBITED_MEDICATION')).toBe(true);
  });
});
