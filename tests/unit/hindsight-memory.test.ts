import {
  ensurePatientBankExists,
  retainPatientObservation,
  recallPatientMemory,
  reflectOnPatientState,
  createPatientMentalModel,
  getPatientMentalModels,
} from '@/services/hindsight-memory';

describe('Phase 2 — Hindsight Memory Service Unit Tests', () => {
  const trialId = 'TRIAL-100';
  const patientId = 'PATIENT-200';

  test('ensurePatientBankExists returns valid bankId and mode', async () => {
    const res = await ensurePatientBankExists(trialId, patientId);
    expect(res.bankId).toBe('trial_TRIAL-100_patient_PATIENT-200');
    expect(['live', 'mock']).toContain(res.mode);
  });

  test('retainPatientObservation stores patient memory with metadata', async () => {
    const res = await retainPatientObservation(
      trialId,
      patientId,
      'Patient reported mild headache at 2:00 PM.',
      {
        tags: ['symptom', 'headache'],
        metadata: { severity: 'mild' },
      }
    );

    expect(res.ok).toBe(true);
    expect(res.bankId).toBe('trial_TRIAL-100_patient_PATIENT-200');
    expect(res.message).toBeDefined();
  });

  test('recallPatientMemory retrieves retained patient observations', async () => {
    await retainPatientObservation(
      trialId,
      patientId,
      'Patient reported skin rash on left arm.',
      { tags: ['dermatology'] }
    );

    const recall = await recallPatientMemory(trialId, patientId, 'skin rash');
    expect(recall.ok).toBe(true);
    expect(recall.query).toBe('skin rash');
    expect(Array.isArray(recall.results)).toBe(true);
    expect(recall.results.length).toBeGreaterThan(0);
  });

  test('reflectOnPatientState synthesizes contextual answers grounded in facts', async () => {
    const reflect = await reflectOnPatientState(
      trialId,
      patientId,
      'Has the patient reported any skin symptoms?'
    );

    expect(reflect.ok).toBe(true);
    expect(reflect.answer).toBeDefined();
    expect(typeof reflect.answer).toBe('string');
  });

  test('createPatientMentalModel and getPatientMentalModels manage longitudinal models', async () => {
    const created = await createPatientMentalModel(
      trialId,
      patientId,
      'Skin Reaction Pattern',
      'Track progression of skin rash and dermatological side effects.'
    );

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Skin Reaction Pattern');

    const models = await getPatientMentalModels(trialId, patientId);
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    const found = models.find((m) => m.name === 'Skin Reaction Pattern');
    expect(found).toBeDefined();
  });

  test('cross-patient isolation prevents Patient B from recalling Patient A memories', async () => {
    const patientA = 'PATIENT-ISO-A';
    const patientB = 'PATIENT-ISO-B';

    // Retain unique memory for Patient A
    await retainPatientObservation(
      trialId,
      patientA,
      'Patient A experienced severe dizziness and unusual vertigo on Tuesday morning.',
      { tags: ['dizziness'] }
    );

    // Retain different memory for Patient B
    await retainPatientObservation(
      trialId,
      patientB,
      'Patient B reported no adverse symptoms and took medication on time.',
      { tags: ['compliant'] }
    );

    // Query Patient B for Patient A's unique symptom
    const recallB = await recallPatientMemory(trialId, patientB, 'vertigo');
    expect(recallB.ok).toBe(true);

    // Patient B's results must NOT contain Patient A's vertigo observation
    const containsPatientAMemory = recallB.results.some((r) =>
      r.text.includes('Patient A experienced severe dizziness')
    );
    expect(containsPatientAMemory).toBe(false);
  });
});
