import {
  ProtocolModel,
  PatientModel,
  CheckInModel,
  ComplianceLogModel,
  AuditEventModel,
} from '@/models';

describe('Phase 3 — MongoDB Models Unit Tests', () => {
  test('ProtocolModel validates required fields and rule structure', async () => {
    const protocolDoc = new ProtocolModel({
      protocolId: 'TEST-PROTO-1',
      title: 'Test Protocol Title',
      phase: 'Phase II',
      indication: 'Oncology',
      investigationalProduct: 'Test Drug 50mg',
      dosingSchedule: {
        frequency: 'Daily',
        allowedWindowMinutes: 60,
      },
      rules: [
        {
          ruleId: 'RULE-1',
          category: 'PROHIBITED_MEDICATION',
          name: 'No Aspirin',
          description: 'Aspirin is prohibited',
          severity: 'HIGH',
          parameters: { prohibitedSubstances: ['aspirin'] },
        },
      ],
    });

    const err = await protocolDoc.validate().catch((e) => e);
    expect(err).toBeUndefined();
    expect(protocolDoc.protocolId).toBe('TEST-PROTO-1');
    expect(protocolDoc.rules.length).toBe(1);
    expect(protocolDoc.rules[0].category).toBe('PROHIBITED_MEDICATION');
  });

  test('PatientModel validates status enum and hindsightBankId', async () => {
    const patientDoc = new PatientModel({
      patientId: 'P-999',
      trialId: 'TEST-PROTO-1',
      hindsightBankId: 'trial_TEST-PROTO-1_patient_P-999',
      status: 'active',
      cohort: 'Cohort 1',
      treatmentArm: 'Arm A',
    });

    const err = await patientDoc.validate().catch((e) => e);
    expect(err).toBeUndefined();
    expect(patientDoc.hindsightBankId).toBe('trial_TEST-PROTO-1_patient_P-999');
    expect(patientDoc.status).toBe('active');
  });

  test('PatientModel rejects invalid status enum', async () => {
    const patientDoc = new PatientModel({
      patientId: 'P-999',
      trialId: 'TEST-PROTO-1',
      hindsightBankId: 'trial_TEST-PROTO-1_patient_P-999',
      status: 'invalid_status_string' as unknown as import('@/types').PatientStatus,
    });

    const err = await patientDoc.validate().catch((e) => e);
    expect(err).toBeDefined();
    expect(err?.errors.status).toBeDefined();
  });

  test('CheckInModel validates channel and extracted symptoms payload', async () => {
    const checkInDoc = new CheckInModel({
      checkInId: 'CHK-001',
      patientId: 'P-999',
      trialId: 'TEST-PROTO-1',
      dayNumber: 1,
      rawResponse: 'Took medication on time',
      channel: 'WEB_FORM',
      extractedData: {
        doseTaken: true,
        symptoms: [{ name: 'Nausea', severity: 'mild' }],
        concomitantMedications: [],
      },
    });

    const err = await checkInDoc.validate().catch((e) => e);
    expect(err).toBeUndefined();
    expect(checkInDoc.extractedData.doseTaken).toBe(true);
    expect(checkInDoc.extractedData.symptoms[0].name).toBe('Nausea');
  });

  test('ComplianceLogModel validates overallStatus enum and violations', async () => {
    const logDoc = new ComplianceLogModel({
      logId: 'LOG-001',
      checkInId: 'CHK-001',
      patientId: 'P-999',
      trialId: 'TEST-PROTO-1',
      overallStatus: 'NON_COMPLIANT',
      violations: [
        {
          ruleId: 'RULE-1',
          ruleName: 'Prohibited Medication',
          category: 'PROHIBITED_MEDICATION',
          severity: 'HIGH',
          description: 'Patient ingested prohibited NSAID',
          evidence: 'Mentioned taking Ibuprofen 400mg',
          recommendation: 'Instruct patient to discontinue NSAID immediately.',
        },
      ],
      hindsightEvidence: ['Patient reported taking ibuprofen on Day 3 check-in.'],
      requiresCoordinatorAction: true,
    });

    const err = await logDoc.validate().catch((e) => e);
    expect(err).toBeUndefined();
    expect(logDoc.overallStatus).toBe('NON_COMPLIANT');
    expect(logDoc.requiresCoordinatorAction).toBe(true);
  });

  test('AuditEventModel validates append-only action log structure', async () => {
    const auditDoc = new AuditEventModel({
      eventId: 'AUD-001',
      action: 'PROTOCOL_EVALUATED',
      actor: 'compliance_agent_v1',
      trialId: 'TEST-PROTO-1',
      patientId: 'P-999',
      details: { status: 'NON_COMPLIANT', violationCount: 1 },
    });

    const err = await auditDoc.validate().catch((e) => e);
    expect(err).toBeUndefined();
    expect(auditDoc.action).toBe('PROTOCOL_EVALUATED');
  });
});
