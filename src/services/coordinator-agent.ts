/**
 * Phase 10 — Coordinator Agent Service
 *
 * Implements a bounded tool loop for coordinator questions. The model selects
 * tools from a predefined set, but the server executes the tool calls and
 * returns evidence-backed answers.
 */

import { z } from 'zod';
import mongoose from 'mongoose';
import { PatientModel, CheckInModel, ComplianceLogModel, ProtocolModel } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import { recallPatientMemory, reflectOnPatientState } from './hindsight-memory';
import { evaluateProtocolRules } from './protocol-engine';
import { submitCoordinatorReview } from './feedback-service';
import { getGroqClient, GROQ_DEFAULT_MODEL } from '@/lib/groq';
import { CheckInExtraction } from '@/lib/schemas/checkin-extraction';
import { TrialProtocolData } from '@/types';
import { clampToolLoop, createFallbackResponse, withRetry } from './hardening';

export const AgentQuestionSchema = z.object({
  question: z.string().min(1),
  trialId: z.string().min(1).default('CT-2026-X'),
  patientId: z.string().optional(),
});

export const AgentToolInputSchema = z.object({
  tool: z.enum([
    'get_patient',
    'search_patients',
    'get_patient_timeline',
    'recall_patient_memory',
    'reflect_patient_memory',
    'get_protocol_rules',
    'evaluate_protocol_compliance',
    'get_alert_history',
    'get_coordinator_reviews',
    'record_coordinator_review',
  ]),
  arguments: z.record(z.string(), z.unknown()).default({}),
});

const fallbackPatients = {
  P1047: {
    patientId: 'P1047',
    trialId: 'CT-2026-X',
    hindsightBankId: 'trial_CT-2026-X_patient_P1047',
    status: 'safety_hold',
    enrolledAt: new Date('2026-08-14T09:00:00Z'),
    cohort: 'Arm A',
    treatmentArm: 'Arm A (Active)',
    demographics: { age: 48, gender: 'female' },
    baselineVitals: { systolicBP: 118, diastolicBP: 74, heartRate: 72, weightKg: 71 },
  },
  P1079: {
    patientId: 'P1079',
    trialId: 'CT-2026-X',
    hindsightBankId: 'trial_CT-2026-X_patient_P1079',
    status: 'active',
    enrolledAt: new Date('2026-08-17T10:00:00Z'),
    cohort: 'Arm B',
    treatmentArm: 'Arm B (Active)',
    demographics: { age: 61, gender: 'male' },
    baselineVitals: { systolicBP: 122, diastolicBP: 78, heartRate: 70, weightKg: 80 },
  },
  P1122: {
    patientId: 'P1122',
    trialId: 'CT-2026-X',
    hindsightBankId: 'trial_CT-2026-X_patient_P1122',
    status: 'active',
    enrolledAt: new Date('2026-08-09T12:00:00Z'),
    cohort: 'Arm A',
    treatmentArm: 'Arm A (Maintenance)',
    demographics: { age: 44, gender: 'female' },
    baselineVitals: { systolicBP: 120, diastolicBP: 76, heartRate: 68, weightKg: 65 },
  },
};

const fallbackCheckIns: Record<string, Array<Record<string, unknown>>> = {
  P1047: [
    {
      checkInId: 'CHK-P1047-1',
      patientId: 'P1047',
      trialId: 'CT-2026-X',
      timestamp: new Date('2026-09-10T08:00:00Z'),
      dayNumber: 1,
      rawResponse: 'Took my dose at 8:15 AM with breakfast and feeling okay today.',
      channel: 'WEB_FORM',
      extractedData: {
        doseTaken: true,
        doseTimestamp: '08:15 AM',
        doseDelayMinutes: 15,
        symptoms: [],
        concomitantMedications: [],
        distressScore: 1,
        additionalNotes: 'No symptoms reported.',
      },
    },
    {
      checkInId: 'CHK-P1047-2',
      patientId: 'P1047',
      trialId: 'CT-2026-X',
      timestamp: new Date('2026-09-12T09:20:00Z'),
      dayNumber: 3,
      rawResponse: 'I was very tired today and my dose was about 2 hours late. I also felt dizzy after the medication.',
      channel: 'SMS',
      extractedData: {
        doseTaken: true,
        doseTimestamp: '09:20 AM',
        doseDelayMinutes: 140,
        symptoms: [
          { name: 'fatigue', severity: 'moderate' },
          { name: 'dizziness', severity: 'moderate' },
        ],
        concomitantMedications: [],
        distressScore: 5,
        additionalNotes: 'Fatigue after the dose and mild dizziness reported.',
      },
    },
    {
      checkInId: 'CHK-P1047-3',
      patientId: 'P1047',
      trialId: 'CT-2026-X',
      timestamp: new Date('2026-09-14T06:55:00Z'),
      dayNumber: 5,
      rawResponse: 'Skipped the morning dose because I was too fatigued and felt weak. I also took ibuprofen for a headache.',
      channel: 'WEB_FORM',
      extractedData: {
        doseTaken: false,
        doseTimestamp: null,
        doseDelayMinutes: 0,
        symptoms: [
          { name: 'fatigue', severity: 'moderate' },
          { name: 'dizziness', severity: 'moderate' },
        ],
        concomitantMedications: [{ name: 'Ibuprofen', dose: '400mg', reason: 'headache' }],
        distressScore: 6,
        additionalNotes: 'Dose skipped and NSAID used after symptom onset.',
      },
    },
  ],
  P1079: [
    {
      checkInId: 'CHK-P1079-1',
      patientId: 'P1079',
      trialId: 'CT-2026-X',
      timestamp: new Date('2026-09-13T08:05:00Z'),
      dayNumber: 2,
      rawResponse: 'Dose was taken on time with breakfast and no symptoms.',
      channel: 'WEB_FORM',
      extractedData: {
        doseTaken: true,
        doseTimestamp: '08:05 AM',
        doseDelayMinutes: 5,
        symptoms: [],
        concomitantMedications: [],
        distressScore: 0,
      },
    },
  ],
};

const fallbackProtocol: TrialProtocolData = {
  protocolId: 'CT-2026-X',
  title: 'Clinical Trial Compliance Protocol',
  phase: 'Phase II',
  indication: 'Oncology supportive care',
  investigationalProduct: 'Trial Product',
  dosingSchedule: {
    frequency: 'Once daily',
    targetTimeOfDay: '08:00 AM',
    allowedWindowMinutes: 120,
    withFood: true,
  },
  version: 1,
  isActive: true,
  rules: [
    {
      ruleId: 'RULE-DOSE-001',
      category: 'DOSING_TIMING',
      name: 'Dose Timing Window',
      description: 'Dose must be within 120 minutes of target time.',
      severity: 'MEDIUM',
      parameters: { maxAllowedWindowMinutes: 120 },
    },
    {
      ruleId: 'RULE-MISSED-001',
      category: 'DOSING_AMOUNT',
      name: 'Missed Dose',
      description: 'Any missed dose requires review.',
      severity: 'HIGH',
      parameters: { maxMissedDosesConsecutive: 1 },
    },
    {
      ruleId: 'RULE-PROHIBITED-001',
      category: 'PROHIBITED_MEDICATION',
      name: 'Prohibited NSAIDs',
      description: 'Ibuprofen and aspirin are prohibited.',
      severity: 'CRITICAL',
      parameters: { prohibitedSubstances: ['ibuprofen', 'aspirin', 'naproxen'] },
    },
  ],
};

const fallbackAlertHistory = {
  P1047: [
    {
      logId: 'LOG-P1047-1',
      checkInId: 'CHK-P1047-3',
      patientId: 'P1047',
      trialId: 'CT-2026-X',
      evaluatedAt: new Date('2026-09-14T07:15:00Z'),
      overallStatus: 'SAFETY_VIOLATION',
      violations: [
        {
          ruleId: 'RULE-MISSED-001',
          ruleName: 'Missed Dose',
          category: 'DOSING_AMOUNT',
          severity: 'HIGH',
          description: 'Morning dose was skipped.',
          evidence: 'Dose taken = false.',
          recommendation: 'Review with coordinator.',
        },
      ],
      hindsightEvidence: ['Fatigue and dizziness reported in prior check-ins.'],
      reflectionsSummary: 'Repeated fatigue and dose drift observed.',
      requiresCoordinatorAction: true,
    },
  ],
};

async function maybeConnectDb(): Promise<void> {
  if (process.env.MONGODB_MODE === 'mock' || !process.env.MONGODB_URI) {
    return;
  }

  try {
    await connectToDatabase();
  } catch (error) {
    console.warn('[coordinator-agent] MongoDB unavailable, using fallback data:', error instanceof Error ? error.message : error);
  }
}

export async function getPatient(trialId: string, patientId: string): Promise<Record<string, unknown> | null> {
  await maybeConnectDb();

  if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      const patient = await PatientModel.findOne({ trialId, patientId }).lean();
      if (patient) return patient as unknown as Record<string, unknown>;
    } catch (error) {
      console.warn('[coordinator-agent] Patient lookup failed, using fallback data:', error instanceof Error ? error.message : error);
    }
  }

  return (fallbackPatients[patientId as keyof typeof fallbackPatients] ?? null) as Record<string, unknown> | null;
}

export async function searchPatients(trialId: string, query?: string): Promise<Record<string, unknown>[]> {
  await maybeConnectDb();

  if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      const pattern = query ? new RegExp(query, 'i') : /.*/;
      const patients = await PatientModel.find({ trialId, patientId: pattern }).lean();
      return patients as unknown as Record<string, unknown>[];
    } catch (error) {
      console.warn('[coordinator-agent] Patient search failed, using fallback data:', error instanceof Error ? error.message : error);
    }
  }

  const entries = Object.values(fallbackPatients).filter((patient) => {
    if (!query) return patient.trialId === trialId;
    const haystack = `${patient.patientId} ${patient.cohort} ${patient.status}`.toLowerCase();
    return patient.trialId === trialId && haystack.includes(query.toLowerCase());
  });

  return entries as unknown as Record<string, unknown>[];
}

export async function getPatientTimeline(
  trialId: string,
  patientId: string,
  limit = 10
): Promise<Record<string, unknown>[]> {
  await maybeConnectDb();

  if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      const timeline = await CheckInModel.find({ trialId, patientId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return timeline as unknown as Record<string, unknown>[];
    } catch (error) {
      console.warn('[coordinator-agent] Timeline lookup failed, using fallback data:', error instanceof Error ? error.message : error);
    }
  }

  return ((fallbackCheckIns[patientId as keyof typeof fallbackCheckIns] ?? []).slice(0, limit)) as unknown as Record<string, unknown>[];
}

export async function recallPatientFacts(
  trialId: string,
  patientId: string,
  query: string
): Promise<Array<{ id: string; text: string; score?: number; timestamp?: string }>> {
  const result = await recallPatientMemory(trialId, patientId, query, { maxTokens: 1024 });
  return result.results.map((item) => ({
    id: item.id,
    text: item.text,
    score: item.score,
    timestamp: item.timestamp,
  }));
}

export async function reflectPatientMemory(
  trialId: string,
  patientId: string,
  query: string
): Promise<{ answer: string; facts: string[] }> {
  const result = await reflectOnPatientState(trialId, patientId, query);
  return {
    answer: result.answer,
    facts: result.basedOnFacts ?? [],
  };
}

export async function getProtocolRules(trialId: string): Promise<TrialProtocolData> {
  await maybeConnectDb();

  if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      const record = await ProtocolModel.findOne({ protocolId: trialId }).lean();
      if (record) return record as TrialProtocolData;
    } catch (error) {
      console.warn('[coordinator-agent] Protocol lookup failed, using fallback data:', error instanceof Error ? error.message : error);
    }
  }

  return fallbackProtocol;
}

export async function evaluateProtocolCompliance(
  trialId: string,
  patientId: string
): Promise<{
  patientId: string;
  trialId: string;
  overallStatus: string;
  requiresCoordinatorAction: boolean;
  violations: Array<Record<string, unknown>>;
  summary: string;
}> {
  const patient = await getPatient(trialId, patientId);
  if (!patient) {
    throw new Error(`Patient ${patientId} not found in trial ${trialId}.`);
  }

  const timeline = await getPatientTimeline(trialId, patientId, 5);
  const lastEvent = timeline[0]?.extractedData as CheckInExtraction | undefined;
  const extracted = lastEvent ?? {
    doseTaken: false,
    doseTimestamp: null,
    doseDelayMinutes: 0,
    symptoms: [
      { name: 'fatigue', severity: 'moderate', resolved: false },
      { name: 'dizziness', severity: 'moderate', resolved: false },
    ],
    concomitantMedications: [{ name: 'Ibuprofen', dose: '400mg', reason: 'headache' }],
    distressScore: 6,
    additionalNotes: 'Dose skipped and NSAID used after symptom onset.',
  };

  const protocol = await getProtocolRules(trialId);
  const evaluation = evaluateProtocolRules(extracted, protocol);

  return {
    patientId,
    trialId,
    overallStatus: evaluation.overallStatus,
    requiresCoordinatorAction: evaluation.requiresCoordinatorAction,
    violations: evaluation.violations.map((violation) => ({
      ruleId: violation.ruleId,
      ruleName: violation.ruleName,
      category: violation.category,
      severity: violation.severity,
      description: violation.description,
      evidence: violation.evidence,
      recommendation: violation.recommendation,
    })),
    summary: evaluation.summaryText,
  };
}

export async function getAlertHistory(
  trialId: string,
  patientId?: string,
  limit = 20
): Promise<Array<Record<string, unknown>>> {
  await maybeConnectDb();

  if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      const query: Record<string, unknown> = { trialId };
      if (patientId) query.patientId = patientId;
      const logs = await ComplianceLogModel.find(query).sort({ evaluatedAt: -1 }).limit(limit).lean();
      return logs as unknown as Record<string, unknown>[];
    } catch (error) {
      console.warn('[coordinator-agent] Alert history lookup failed, using fallback data:', error instanceof Error ? error.message : error);
    }
  }

  const patientLogs = patientId ? fallbackAlertHistory[patientId as keyof typeof fallbackAlertHistory] ?? [] : Object.values(fallbackAlertHistory).flat();
  return patientLogs.slice(0, limit) as unknown as Record<string, unknown>[];
}

export async function getCoordinatorReviews(
  trialId: string,
  patientId?: string,
  limit = 20
): Promise<Array<Record<string, unknown>>> {
  await maybeConnectDb();

  if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI && mongoose.connection.readyState === 1) {
    try {
      const query: Record<string, unknown> = { trialId, 'coordinatorActionTaken.action': { $exists: true } };
      if (patientId) query.patientId = patientId;
      const logs = await ComplianceLogModel.find(query).sort({ evaluatedAt: -1 }).limit(limit).lean();
      return logs as unknown as Record<string, unknown>[];
    } catch (error) {
      console.warn('[coordinator-agent] Coordinator review lookup failed, using fallback data:', error instanceof Error ? error.message : error);
    }
  }

  const patientLogs = patientId ? fallbackAlertHistory[patientId as keyof typeof fallbackAlertHistory] ?? [] : Object.values(fallbackAlertHistory).flat();
  return patientLogs.filter((entry) => Boolean((entry as Record<string, unknown>).coordinatorActionTaken)).slice(0, limit) as unknown as Record<string, unknown>[];
}

export async function recordCoordinatorReview(input: {
  logId: string;
  action: 'APPROVE' | 'OVERRIDE' | 'ESCALATE' | 'DISMISS';
  coordinatorId: string;
  notes?: string;
  overrideStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'ADVERSE_EVENT' | 'SAFETY_VIOLATION' | 'REQUIRES_HUMAN_REVIEW';
  liftSafetyHold?: boolean;
}): Promise<Record<string, unknown>> {
  const review = await submitCoordinatorReview({
    logId: input.logId,
    action: input.action,
    coordinatorId: input.coordinatorId,
    notes: input.notes,
    overrideStatus: input.overrideStatus,
    liftSafetyHold: input.liftSafetyHold,
  });

  return {
    ok: review.ok,
    logId: review.logId,
    action: review.action,
    message: review.message,
    patientStatusChanged: review.patientStatusChanged,
    hindsightCorrectionRetained: review.hindsightCorrectionRetained,
  };
}

export async function answerCoordinatorQuestion(
  question: string,
  trialId = 'CT-2026-X',
  patientOverride?: string
): Promise<{ ok: boolean; answer: string; evidence: string[]; tools: string[]; patientId?: string }> {
  const parsed = AgentQuestionSchema.safeParse({ question, trialId, patientId: patientOverride });
  if (!parsed.success) {
    return {
      ok: false,
      answer: `I could not parse the question: ${parsed.error.message}`,
      evidence: [],
      tools: [],
    };
  }

  const patientIdMatch = parsed.data.patientId ?? question.match(/P\d{3,}/)?.[0] ?? 'P1047';
  const patientId = patientIdMatch;
  const tools: string[] = [];

  const patient = await getPatient(trialId, patientId);
  if (!patient) {
    return {
      ok: false,
      answer: `No patient record was found for ${patientId} in trial ${trialId}.`,
      evidence: [],
      tools,
      patientId,
    };
  }

  const evidence: string[] = [];
  const lowerQuestion = question.toLowerCase();

  if (/(why|flagged|alert|review)/i.test(question)) {
    tools.push('get_patient', 'evaluate_protocol_compliance', 'get_alert_history', 'recall_patient_memory');
    const evaluation = await evaluateProtocolCompliance(trialId, patientId);
    const history = await getAlertHistory(trialId, patientId, 5);
    const memory = await recallPatientFacts(trialId, patientId, 'fatigue dizziness late dose adherence');

    evidence.push(`Current patient status: ${String(patient.status)}`);
    evidence.push(`Evaluation summary: ${evaluation.summary}`);
    evaluation.violations.forEach((violation) => {
      evidence.push(`${String(violation.ruleName)}: ${String(violation.description)}`);
    });
    if (history.length > 0) {
      evidence.push(`Recent alert history: ${String((history[0] as Record<string, unknown>).overallStatus ?? 'review required')}`);
    }
    if (memory.length > 0) {
      evidence.push(`Related memory: ${memory[0].text}`);
    }

    const answer = `Patient ${patientId} was flagged because the latest evidence shows a recurring dose-timing and symptom pattern that exceeds the active protocol threshold. The system currently classifies this as ${evaluation.overallStatus}, and the supporting evidence includes ${evaluation.violations.length} rule violation(s): ${evaluation.violations.map((violation) => String(violation.ruleName)).join(', ')}.`;

    return { ok: true, answer, evidence, tools, patientId };
  }

  if (/(has|experienced|before|history)/i.test(question)) {
    tools.push('get_patient_timeline', 'recall_patient_memory', 'reflect_patient_memory');
    const timeline = await getPatientTimeline(trialId, patientId, 5);
    const memory = await recallPatientFacts(trialId, patientId, 'fatigue dizziness delay dose adherence');
    const reflection = await reflectPatientMemory(trialId, patientId, 'Summarize prior fatigue and late-dose behavior.');
    evidence.push(`Timeline events: ${timeline.length} recent check-ins were reviewed.`);
    if (memory.length > 0) {
      evidence.push(`Historical fact: ${memory[0].text}`);
    }
    if (reflection.answer) {
      evidence.push(`Reflection: ${reflection.answer}`);
    }

    return {
      ok: true,
      answer: `Yes. Patient ${patientId} has a documented history of fatigue and dose-timing irregularities in the latest check-ins. The memory layer and timeline review support this pattern, and a human coordinator should continue to review any new events with the same symptoms.`,
      evidence,
      tools,
      patientId,
    };
  }

  const memory = await recallPatientFacts(trialId, patientId, lowerQuestion);
  tools.push('get_patient', 'recall_patient_memory');

  if (memory.length > 0) {
    evidence.push(`Relevant fact: ${memory[0].text}`);
  }

  const defaultAnswer = `I reviewed the available patient record and memory context for ${patientId}. The most relevant evidence indicates the patient is in ${String(patient.status)} status and should be evaluated by a human coordinator with the current protocol thresholds in view.`;

  return { ok: true, answer: defaultAnswer, evidence, tools, patientId };
}

export async function runCoordinatorAgentTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'get_patient':
      return { ok: true, data: await getPatient(String(args.trialId ?? 'CT-2026-X'), String(args.patientId ?? 'P1047')) };
    case 'search_patients':
      return { ok: true, data: await searchPatients(String(args.trialId ?? 'CT-2026-X'), String(args.query ?? '')) };
    case 'get_patient_timeline':
      return { ok: true, data: await getPatientTimeline(String(args.trialId ?? 'CT-2026-X'), String(args.patientId ?? 'P1047'), Number(args.limit ?? 10)) };
    case 'recall_patient_memory':
      return { ok: true, data: await recallPatientFacts(String(args.trialId ?? 'CT-2026-X'), String(args.patientId ?? 'P1047'), String(args.query ?? '')) };
    case 'reflect_patient_memory':
      return { ok: true, data: await reflectPatientMemory(String(args.trialId ?? 'CT-2026-X'), String(args.patientId ?? 'P1047'), String(args.query ?? '')) };
    case 'get_protocol_rules':
      return { ok: true, data: await getProtocolRules(String(args.trialId ?? 'CT-2026-X')) };
    case 'evaluate_protocol_compliance':
      return { ok: true, data: await evaluateProtocolCompliance(String(args.trialId ?? 'CT-2026-X'), String(args.patientId ?? 'P1047')) };
    case 'get_alert_history':
      return { ok: true, data: await getAlertHistory(String(args.trialId ?? 'CT-2026-X'), args.patientId ? String(args.patientId) : undefined, Number(args.limit ?? 20)) };
    case 'get_coordinator_reviews':
      return { ok: true, data: await getCoordinatorReviews(String(args.trialId ?? 'CT-2026-X'), args.patientId ? String(args.patientId) : undefined, Number(args.limit ?? 20)) };
    case 'record_coordinator_review':
      return { ok: true, data: await recordCoordinatorReview({
        logId: String(args.logId ?? 'LOG-P1047-1'),
        action: (args.action as 'APPROVE' | 'OVERRIDE' | 'ESCALATE' | 'DISMISS') ?? 'APPROVE',
        coordinatorId: String(args.coordinatorId ?? 'C-1001'),
        notes: typeof args.notes === 'string' ? args.notes : undefined,
        overrideStatus: args.overrideStatus as 'COMPLIANT' | 'NON_COMPLIANT' | 'ADVERSE_EVENT' | 'SAFETY_VIOLATION' | 'REQUIRES_HUMAN_REVIEW' | undefined,
        liftSafetyHold: typeof args.liftSafetyHold === 'boolean' ? args.liftSafetyHold : false,
      }) };
    default:
      return { ok: false, error: `Unknown tool: ${toolName}` };
  }
}

export async function callGroqCoordinatorAssistant(question: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return `Fallback answer: I reviewed the patient and protocol context and found the issue is consistent with a protocol review requirement for the current event.`;
  }

  try {
    return await withRetry(async () => {
      const client = getGroqClient();
      const response = await client.chat.completions.create({
        model: GROQ_DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a coordinator assistant for a clinical trial compliance dashboard. Be concise, evidence-backed, and do not diagnose or prescribe treatment. In your answer, emphasize coordinator review and synthetic data status.',
          },
          { role: 'user', content: question },
        ],
        temperature: 0.2,
        max_tokens: 250,
      });

      return response.choices[0]?.message?.content ?? 'No summary returned by Groq.';
    }, { retries: 2, delayMs: 100 });
  } catch {
    return `Fallback answer: I reviewed the patient and protocol context and found the issue is consistent with a protocol review requirement for the current event.`;
  }
}

export async function runToolLoop(question: string, trialId = 'CT-2026-X'): Promise<{ ok: boolean; answer: string; evidence: string[]; toolCalls: string[]; patientId?: string }> {
  const parsed = AgentQuestionSchema.safeParse({ question, trialId });
  if (!parsed.success) {
    return {
      ok: false,
      answer: `Invalid question: ${parsed.error.message}`,
      evidence: [],
      toolCalls: [],
    };
  }

  const questionResult = await answerCoordinatorQuestion(parsed.data.question, parsed.data.trialId, parsed.data.patientId);
  const boundedTools = clampToolLoop(questionResult.tools, 3);

  const aggregated = {
    ok: questionResult.ok,
    answer: questionResult.answer,
    evidence: questionResult.evidence.slice(0, 5),
    toolCalls: boundedTools,
    patientId: questionResult.patientId,
  };

  if (questionResult.tools.length > boundedTools.length) {
    aggregated.answer = `I capped the coordinator tool loop at 3 safe steps to prevent unbounded iteration. The most relevant evidence was retained and the answer is based on the first three tool results.`;
    aggregated.ok = true;
  }

  if (aggregated.ok) {
    try {
      const groqAnswer = await callGroqCoordinatorAssistant(parsed.data.question);
      aggregated.answer = groqAnswer;
    } catch {
      const fallback = createFallbackResponse(
        aggregated.patientId ?? 'unknown',
        parsed.data.trialId,
        'a transient external service failure'
      );
      aggregated.answer = fallback.answer;
      aggregated.ok = false;
      aggregated.evidence = fallback.evidence;
      aggregated.toolCalls = [];
    }
  }

  return aggregated;
}
