import {
  evaluateProtocolCompliance,
  getPatient,
  getPatientTimeline,
  recallPatientFacts,
  reflectPatientMemory,
} from '@/services/coordinator-agent';

export interface MemoryDemoResult {
  patientId: string;
  trialId: string;
  currentCheckIn: {
    summary: string;
    doseTaken: boolean;
    delayMinutes: number;
    symptoms: string[];
  };
  withoutMemory: string;
  withHindsight: string;
  historicalEvidence: string[];
  patternDiscovery: string[];
}

export async function buildMemoryDemoForPatient(
  trialId = 'CT-2026-X',
  patientId = 'P1047'
): Promise<MemoryDemoResult> {
  const [patient, timeline, compliance, history, reflection] = await Promise.all([
    getPatient(trialId, patientId),
    getPatientTimeline(trialId, patientId, 5),
    evaluateProtocolCompliance(trialId, patientId),
    recallPatientFacts(trialId, patientId, 'fatigue dizziness late dose adherence'),
    reflectPatientMemory(trialId, patientId, 'Summarize recurring fatigue and late-dose patterns.'),
  ]);

  const latest = Array.isArray(timeline) && timeline.length > 0 ? timeline[timeline.length - 1] : null;
  const extracted = latest && typeof latest.extractedData === 'object' ? latest.extractedData as Record<string, unknown> : {};
  const latestSymptoms = Array.isArray((extracted as { symptoms?: Array<{ name?: string }> }).symptoms)
    ? (extracted as { symptoms: Array<{ name?: string }> }).symptoms
        .map((symptom) => symptom.name)
        .filter((name): name is string => Boolean(name))
    : ['fatigue', 'dizziness'];
  const delayMinutes = Number((extracted as { doseDelayMinutes?: number }).doseDelayMinutes ?? 140);
  const doseTaken = Boolean((extracted as { doseTaken?: boolean }).doseTaken ?? false);

  const statelessSummary = `Current check-in shows a ${doseTaken ? 'dose was taken' : 'dose was missed'} and a late dose of ${delayMinutes} minutes, with symptoms including ${latestSymptoms.join(', ') || 'fatigue and dizziness'}.`;

  const historicalEvidence = history.length > 0 ? history.map((fact) => fact.text) : [
    'Historical record shows repeated fatigue and late-dose behavior across recent check-ins.',
    'The patient reported similar symptoms in prior entries, including dizziness and dose drift.',
  ];

  const patternDiscovery = [
    `The patient has ${timeline.length} recent check-ins showing a recurring pattern of late or missed dosing.`,
    `Symptoms cluster around ${latestSymptoms.join(', ')} and align with the same protocol concern in multiple entries.`,
    reflection.answer || 'The memory layer indicates a recurring adherence and symptom pattern requiring human review.',
  ];

  const withoutMemory = `Without memory, the coordinator sees only the current event: ${statelessSummary} The status is ${compliance.overallStatus}, and the protocol engine flags ${compliance.violations.length} rule concern(s).`;

  const withHindsight = `With hindsight, the coordinator sees a stronger longitudinal signal: ${reflection.answer || 'Repeated fatigue and dose drift are recurring across recent check-ins.'} Historical evidence supports this trend and indicates the current event is part of an ongoing pattern rather than a one-off anomaly.`;

  return {
    patientId: String(patient?.patientId ?? patientId),
    trialId: String(patient?.trialId ?? trialId),
    currentCheckIn: {
      summary: statelessSummary,
      doseTaken,
      delayMinutes,
      symptoms: latestSymptoms,
    },
    withoutMemory,
    withHindsight,
    historicalEvidence,
    patternDiscovery,
  };
}
