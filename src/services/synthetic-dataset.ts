import { buildBankId } from '@/lib/hindsight';

export interface SyntheticCheckIn {
  dayNumber: number;
  timestamp: string;
  doseTaken: boolean;
  doseDelayMinutes: number;
  symptoms: string[];
  distressScore: number;
  rawResponse: string;
}

export interface SyntheticPatientHistory {
  patientId: string;
  trialId: string;
  bankId: string;
  status: 'active' | 'safety_hold' | 'review' | 'withdrawn';
  cohort: string;
  treatmentArm: string;
  age: number;
  gender: string;
  adherence: number;
  checkIns: SyntheticCheckIn[];
  memoryNotes: string[];
}

export interface SyntheticBenchmarkQuestion {
  patientId: string;
  question: string;
  focus: string;
}

export interface SyntheticDataset {
  trialId: string;
  patientCount: number;
  patients: SyntheticPatientHistory[];
  benchmarkQuestions: SyntheticBenchmarkQuestion[];
}

const patientTemplates = [
  {
    patientId: 'P1047',
    status: 'safety_hold' as const,
    cohort: 'Arm A',
    treatmentArm: 'Arm A (Active)',
    age: 48,
    gender: 'female',
    adherence: 62,
    memoryNotes: [
      'Patient reported fatigue and dizziness after the morning dose twice in the last week.',
      'Dose timing drift increased after reported fatigue episodes.',
      'Coordinator review was recommended due to repeated fatigue and delayed doses.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-10T08:15:00Z', doseTaken: true, doseDelayMinutes: 15, symptoms: ['none'], distressScore: 1, rawResponse: 'Medication taken on time with breakfast. No symptoms.' },
      { dayNumber: 3, timestamp: '2026-09-12T09:20:00Z', doseTaken: true, doseDelayMinutes: 140, symptoms: ['fatigue', 'dizziness'], distressScore: 5, rawResponse: 'Dose was about two hours late; felt very tired and dizzy after the medication.' },
      { dayNumber: 5, timestamp: '2026-09-14T06:55:00Z', doseTaken: false, doseDelayMinutes: 0, symptoms: ['fatigue', 'dizziness'], distressScore: 6, rawResponse: 'Skipped the morning dose because I was too fatigued and also took ibuprofen for a headache.' },
      { dayNumber: 7, timestamp: '2026-09-16T09:40:00Z', doseTaken: true, doseDelayMinutes: 220, symptoms: ['fatigue'], distressScore: 7, rawResponse: 'Dose taken nearly four hours late and fatigue persisted through the day.' },
    ],
  },
  {
    patientId: 'P1079',
    status: 'active' as const,
    cohort: 'Arm B',
    treatmentArm: 'Arm B (Active)',
    age: 61,
    gender: 'male',
    adherence: 90,
    memoryNotes: [
      'Dose timing remained within window across the last 7 days.',
      'No secondary compliance concerns were recorded.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-11T08:05:00Z', doseTaken: true, doseDelayMinutes: 5, symptoms: ['none'], distressScore: 0, rawResponse: 'Dose taken on time with breakfast and no symptoms.' },
      { dayNumber: 3, timestamp: '2026-09-13T08:20:00Z', doseTaken: true, doseDelayMinutes: 20, symptoms: ['mild nausea'], distressScore: 2, rawResponse: 'Slight nausea but dose still taken within the acceptable window.' },
      { dayNumber: 5, timestamp: '2026-09-15T07:50:00Z', doseTaken: true, doseDelayMinutes: 10, symptoms: ['none'], distressScore: 1, rawResponse: 'Dose completed early but within the expected timing range.' },
      { dayNumber: 7, timestamp: '2026-09-17T08:10:00Z', doseTaken: true, doseDelayMinutes: 10, symptoms: ['none'], distressScore: 1, rawResponse: 'No issues reported today. Dose taken with food.' },
    ],
  },
  {
    patientId: 'P1122',
    status: 'review' as const,
    cohort: 'Arm A',
    treatmentArm: 'Arm A (Maintenance)',
    age: 44,
    gender: 'female',
    adherence: 74,
    memoryNotes: [
      'Intermittent fatigue and delayed dosing appeared on two separate check-ins.',
      'Symptoms recurred after missed or delayed doses.',
    ],
    checkIns: [
      { dayNumber: 2, timestamp: '2026-09-09T08:40:00Z', doseTaken: true, doseDelayMinutes: 40, symptoms: ['fatigue'], distressScore: 3, rawResponse: 'Late dose by 40 minutes; felt unusually tired.' },
      { dayNumber: 4, timestamp: '2026-09-11T09:10:00Z', doseTaken: true, doseDelayMinutes: 70, symptoms: ['fatigue'], distressScore: 4, rawResponse: 'Dose was taken later than usual and I still felt drained.' },
      { dayNumber: 6, timestamp: '2026-09-13T08:55:00Z', doseTaken: true, doseDelayMinutes: 55, symptoms: ['fatigue'], distressScore: 4, rawResponse: 'Dose taken with breakfast, but exhaustion again limited my activity.' },
      { dayNumber: 8, timestamp: '2026-09-15T09:15:00Z', doseTaken: true, doseDelayMinutes: 75, symptoms: ['fatigue', 'headache'], distressScore: 5, rawResponse: 'Dose was delayed and headache persisted through the morning.' },
    ],
  },
  {
    patientId: 'P1141',
    status: 'active' as const,
    cohort: 'Arm C',
    treatmentArm: 'Arm C (Escalation)',
    age: 52,
    gender: 'female',
    adherence: 88,
    memoryNotes: [
      'Excellent adherence with no major protocol flags this week.',
      'Mild sleep disruption noted but not consistent with safety concern.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-08T08:05:00Z', doseTaken: true, doseDelayMinutes: 5, symptoms: ['none'], distressScore: 1, rawResponse: 'Took the dose on time.' },
      { dayNumber: 3, timestamp: '2026-09-10T08:18:00Z', doseTaken: true, doseDelayMinutes: 18, symptoms: ['none'], distressScore: 1, rawResponse: 'No concerns; dose taken with breakfast.' },
      { dayNumber: 5, timestamp: '2026-09-12T07:54:00Z', doseTaken: true, doseDelayMinutes: 6, symptoms: ['none'], distressScore: 0, rawResponse: 'Dose was taken early but within tolerance.' },
      { dayNumber: 7, timestamp: '2026-09-14T08:06:00Z', doseTaken: true, doseDelayMinutes: 6, symptoms: ['none'], distressScore: 1, rawResponse: 'Stable; continuing as expected.' },
    ],
  },
  {
    patientId: 'P1176',
    status: 'active' as const,
    cohort: 'Arm B',
    treatmentArm: 'Arm B (Maintenance)',
    age: 63,
    gender: 'male',
    adherence: 91,
    memoryNotes: [
      'Good adherence and no medication interactions recorded in memory.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-09T08:00:00Z', doseTaken: true, doseDelayMinutes: 0, symptoms: ['none'], distressScore: 0, rawResponse: 'On time.' },
      { dayNumber: 3, timestamp: '2026-09-11T08:10:00Z', doseTaken: true, doseDelayMinutes: 10, symptoms: ['none'], distressScore: 1, rawResponse: 'No symptoms.' },
      { dayNumber: 5, timestamp: '2026-09-13T07:58:00Z', doseTaken: true, doseDelayMinutes: 2, symptoms: ['mild nausea'], distressScore: 2, rawResponse: 'Some mild nausea after food but no dose delay.' },
      { dayNumber: 7, timestamp: '2026-09-15T08:05:00Z', doseTaken: true, doseDelayMinutes: 5, symptoms: ['none'], distressScore: 1, rawResponse: 'Stable and compliant.' },
    ],
  },
  {
    patientId: 'P1202',
    status: 'review' as const,
    cohort: 'Arm A',
    treatmentArm: 'Arm A (Active)',
    age: 57,
    gender: 'female',
    adherence: 70,
    memoryNotes: [
      'Repeated late doses and fatigue have been observed over multiple check-ins.',
      'No clear medication contraindication identified in the report history.',
    ],
    checkIns: [
      { dayNumber: 2, timestamp: '2026-09-10T08:50:00Z', doseTaken: true, doseDelayMinutes: 50, symptoms: ['fatigue'], distressScore: 4, rawResponse: 'Dose taken but nearly an hour late and I felt tired.' },
      { dayNumber: 4, timestamp: '2026-09-12T09:25:00Z', doseTaken: true, doseDelayMinutes: 145, symptoms: ['fatigue', 'dizziness'], distressScore: 5, rawResponse: 'Dose taken much later than scheduled and I felt exhausted.' },
      { dayNumber: 6, timestamp: '2026-09-14T09:10:00Z', doseTaken: true, doseDelayMinutes: 70, symptoms: ['fatigue'], distressScore: 3, rawResponse: 'Late dose; fatigue continues but no new medication reported.' },
      { dayNumber: 8, timestamp: '2026-09-16T10:20:00Z', doseTaken: false, doseDelayMinutes: 0, symptoms: ['fatigue'], distressScore: 6, rawResponse: 'I missed the day dose because I felt too weak to take it.' },
    ],
  },
  {
    patientId: 'P1223',
    status: 'active' as const,
    cohort: 'Arm C',
    treatmentArm: 'Arm C (Maintenance)',
    age: 49,
    gender: 'male',
    adherence: 85,
    memoryNotes: [
      'Occasional headache and mild dizziness, but adherence remains generally acceptable.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-08T08:12:00Z', doseTaken: true, doseDelayMinutes: 12, symptoms: ['none'], distressScore: 1, rawResponse: 'Routine check-in, no concerns.' },
      { dayNumber: 3, timestamp: '2026-09-10T08:40:00Z', doseTaken: true, doseDelayMinutes: 40, symptoms: ['headache'], distressScore: 2, rawResponse: 'Mild headache in the morning but dose was still taken.' },
      { dayNumber: 5, timestamp: '2026-09-12T08:55:00Z', doseTaken: true, doseDelayMinutes: 55, symptoms: ['dizziness'], distressScore: 3, rawResponse: 'A little dizzy after breakfast but not severe.' },
      { dayNumber: 7, timestamp: '2026-09-14T08:35:00Z', doseTaken: true, doseDelayMinutes: 35, symptoms: ['headache'], distressScore: 2, rawResponse: 'Headache persisted but dose was completed.' },
    ],
  },
  {
    patientId: 'P1244',
    status: 'active' as const,
    cohort: 'Arm B',
    treatmentArm: 'Arm B (Maintenance)',
    age: 66,
    gender: 'male',
    adherence: 93,
    memoryNotes: [
      'No protocol deviations observed for the current review window.',
      'Routine check-ins indicate stable adherence and low symptom burden.',
    ],
    checkIns: [
      { dayNumber: 2, timestamp: '2026-09-09T07:58:00Z', doseTaken: true, doseDelayMinutes: 2, symptoms: ['none'], distressScore: 0, rawResponse: 'Dose taken exactly on time.' },
      { dayNumber: 4, timestamp: '2026-09-11T08:12:00Z', doseTaken: true, doseDelayMinutes: 12, symptoms: ['none'], distressScore: 0, rawResponse: 'No symptoms or concerns.' },
      { dayNumber: 6, timestamp: '2026-09-13T08:06:00Z', doseTaken: true, doseDelayMinutes: 6, symptoms: ['none'], distressScore: 1, rawResponse: 'Routine response; all okay.' },
      { dayNumber: 8, timestamp: '2026-09-15T08:08:00Z', doseTaken: true, doseDelayMinutes: 8, symptoms: ['none'], distressScore: 1, rawResponse: 'Stable and compliant.' },
    ],
  },
  {
    patientId: 'P1271',
    status: 'safety_hold' as const,
    cohort: 'Arm A',
    treatmentArm: 'Arm A (Escalation)',
    age: 53,
    gender: 'female',
    adherence: 59,
    memoryNotes: [
      'Multiple missed or delayed doses and moderate symptom burden support safety follow-up.',
      'The patient should remain under coordinator surveillance.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-11T09:50:00Z', doseTaken: true, doseDelayMinutes: 110, symptoms: ['fatigue', 'dizziness'], distressScore: 5, rawResponse: 'Dose was late and I felt dizzy after taking it.' },
      { dayNumber: 3, timestamp: '2026-09-13T10:30:00Z', doseTaken: false, doseDelayMinutes: 0, symptoms: ['fatigue'], distressScore: 6, rawResponse: 'I missed the dose because I was too tired to take it.' },
      { dayNumber: 5, timestamp: '2026-09-15T09:45:00Z', doseTaken: true, doseDelayMinutes: 105, symptoms: ['fatigue', 'dizziness'], distressScore: 6, rawResponse: 'Late dose and dizziness again; concern rising.' },
      { dayNumber: 7, timestamp: '2026-09-17T10:05:00Z', doseTaken: false, doseDelayMinutes: 0, symptoms: ['fatigue'], distressScore: 7, rawResponse: 'Missed dose and too fatigued to continue the regimen.' },
    ],
  },
  {
    patientId: 'P1298',
    status: 'active' as const,
    cohort: 'Arm C',
    treatmentArm: 'Arm C (Active)',
    age: 46,
    gender: 'female',
    adherence: 81,
    memoryNotes: [
      'Intermittent headache and mild nausea, but overall pattern remains manageable.',
    ],
    checkIns: [
      { dayNumber: 2, timestamp: '2026-09-09T08:16:00Z', doseTaken: true, doseDelayMinutes: 16, symptoms: ['headache'], distressScore: 2, rawResponse: 'Dose taken, mild headache after lunch.' },
      { dayNumber: 4, timestamp: '2026-09-11T08:42:00Z', doseTaken: true, doseDelayMinutes: 42, symptoms: ['mild nausea'], distressScore: 3, rawResponse: 'Feeling a bit nauseated but dose taken with food.' },
      { dayNumber: 6, timestamp: '2026-09-13T08:34:00Z', doseTaken: true, doseDelayMinutes: 34, symptoms: ['headache'], distressScore: 3, rawResponse: 'Dose taken later than usual; headache persisted.' },
      { dayNumber: 8, timestamp: '2026-09-15T08:52:00Z', doseTaken: true, doseDelayMinutes: 52, symptoms: ['headache'], distressScore: 3, rawResponse: 'Stable but still mild headache reported.' },
    ],
  },
  {
    patientId: 'P1334',
    status: 'active' as const,
    cohort: 'Arm B',
    treatmentArm: 'Arm B (Maintenance)',
    age: 59,
    gender: 'male',
    adherence: 86,
    memoryNotes: [
      'No significant concerns were recorded in this review window.',
    ],
    checkIns: [
      { dayNumber: 1, timestamp: '2026-09-12T08:15:00Z', doseTaken: true, doseDelayMinutes: 15, symptoms: ['none'], distressScore: 1, rawResponse: 'Routine morning dose; no issues.' },
      { dayNumber: 3, timestamp: '2026-09-14T08:08:00Z', doseTaken: true, doseDelayMinutes: 8, symptoms: ['none'], distressScore: 0, rawResponse: 'Low symptom burden and no issues.' },
      { dayNumber: 5, timestamp: '2026-09-16T08:18:00Z', doseTaken: true, doseDelayMinutes: 18, symptoms: ['none'], distressScore: 1, rawResponse: 'No symptoms or major concerns.' },
      { dayNumber: 7, timestamp: '2026-09-18T08:11:00Z', doseTaken: true, doseDelayMinutes: 11, symptoms: ['none'], distressScore: 1, rawResponse: 'Dose completed on schedule.' },
    ],
  },
];

export function generateBenchmarkQuestions(trialId = 'CT-2026-X'): SyntheticBenchmarkQuestion[] {
  return [
    { patientId: 'P1047', question: 'Why was P1047 flagged?', focus: 'alert_reason' },
    { patientId: 'P1047', question: 'Has P1047 experienced this before?', focus: 'recurrence' },
    { patientId: 'P1122', question: 'Which patients had repeated late doses this month?', focus: 'late_dose_search' },
    { patientId: 'P1047', question: 'What changed in P1047 adherence?', focus: 'adherence_change' },
    { patientId: 'P1047', question: 'Which patients reported fatigue multiple times and also had adherence issues?', focus: 'symptom_plus_adherence' },
    { patientId: 'P1271', question: 'What is the current risk level for P1271?', focus: 'risk_review' },
    { patientId: 'P1223', question: 'Which patient has the strongest adherence stability this week?', focus: 'best_adherence' },
  ].map((item) => ({ ...item, trialId }));
}

export function generateSyntheticDataset(trialId = 'CT-2026-X'): SyntheticDataset {
  const patients = patientTemplates.map((patient) => ({
    patientId: patient.patientId,
    trialId,
    bankId: buildBankId(trialId, patient.patientId),
    status: patient.status,
    cohort: patient.cohort,
    treatmentArm: patient.treatmentArm,
    age: patient.age,
    gender: patient.gender,
    adherence: patient.adherence,
    checkIns: patient.checkIns,
    memoryNotes: patient.memoryNotes,
  }));

  return {
    trialId,
    patientCount: patients.length,
    patients,
    benchmarkQuestions: generateBenchmarkQuestions(trialId),
  };
}
