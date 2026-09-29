import { evaluateProtocolRules } from '@/services/protocol-engine';
import { TrialProtocolData } from '@/types';
import { CheckInExtraction } from '@/lib/schemas/checkin-extraction';

describe('Phase 5 — Deterministic Protocol Engine Unit Tests', () => {
  const sampleProtocol: TrialProtocolData = {
    protocolId: 'TEST-P1',
    title: 'Test Protocol',
    phase: 'Phase II',
    indication: 'Oncology',
    investigationalProduct: 'Test Drug 100mg',
    dosingSchedule: {
      frequency: 'Daily',
      targetTimeOfDay: '08:00 AM',
      allowedWindowMinutes: 120,
      withFood: true,
    },
    version: 1,
    isActive: true,
    rules: [
      {
        ruleId: 'R-TIMING',
        category: 'DOSING_TIMING',
        name: 'Dosing Time Window',
        description: 'Allowed window +-120 min',
        severity: 'MEDIUM',
        parameters: { maxAllowedWindowMinutes: 120 },
      },
      {
        ruleId: 'R-PROHIBITED',
        category: 'PROHIBITED_MEDICATION',
        name: 'Prohibited NSAIDs',
        description: 'Ibuprofen and Aspirin prohibited',
        severity: 'CRITICAL',
        parameters: { prohibitedSubstances: ['ibuprofen', 'aspirin'] },
      },
      {
        ruleId: 'R-MISSED',
        category: 'DOSING_AMOUNT',
        name: 'Missed Dose',
        description: 'Dose must be taken',
        severity: 'HIGH',
        parameters: { maxMissedDosesConsecutive: 1 },
      },
    ],
  };

  test('returns COMPLIANT for a dose taken on time with no symptoms', () => {
    const extraction: CheckInExtraction = {
      doseTaken: true,
      doseTimestamp: '08:15 AM',
      doseDelayMinutes: 15,
      symptoms: [],
      concomitantMedications: [],
      distressScore: 0,
      additionalNotes: 'All good',
    };

    const res = evaluateProtocolRules(extraction, sampleProtocol);
    expect(res.overallStatus).toBe('COMPLIANT');
    expect(res.violations.length).toBe(0);
    expect(res.requiresCoordinatorAction).toBe(false);
  });

  test('flags DOSING_TIMING violation when delay exceeds allowed window', () => {
    const extraction: CheckInExtraction = {
      doseTaken: true,
      doseTimestamp: '11:00 AM',
      doseDelayMinutes: 180, // 180 min > 120 min allowed
      symptoms: [],
      concomitantMedications: [],
      distressScore: 1,
    };

    const res = evaluateProtocolRules(extraction, sampleProtocol);
    expect(res.overallStatus).toBe('NON_COMPLIANT');
    expect(res.violations.some((v) => v.category === 'DOSING_TIMING')).toBe(true);
    expect(res.requiresCoordinatorAction).toBe(true);
  });

  test('flags CRITICAL violation for prohibited concomitant medication ingestion', () => {
    const extraction: CheckInExtraction = {
      doseTaken: true,
      doseTimestamp: '08:00 AM',
      doseDelayMinutes: 0,
      symptoms: [],
      concomitantMedications: [{ name: 'Ibuprofen', dose: '400mg' }],
      distressScore: 2,
    };

    const res = evaluateProtocolRules(extraction, sampleProtocol);
    expect(res.overallStatus).toBe('SAFETY_VIOLATION');
    expect(res.violations.some((v) => v.category === 'PROHIBITED_MEDICATION')).toBe(true);
    expect(res.violations[0].severity).toBe('CRITICAL');
    expect(res.requiresCoordinatorAction).toBe(true);
  });

  test('flags missed dose as HIGH severity violation', () => {
    const extraction: CheckInExtraction = {
      doseTaken: false,
      doseTimestamp: null,
      doseDelayMinutes: 0,
      symptoms: [],
      concomitantMedications: [],
      distressScore: 4,
    };

    const res = evaluateProtocolRules(extraction, sampleProtocol);
    expect(res.overallStatus).toBe('NON_COMPLIANT');
    expect(res.violations.some((v) => v.category === 'DOSING_AMOUNT')).toBe(true);
    expect(res.requiresCoordinatorAction).toBe(true);
  });
});
