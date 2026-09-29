/**
 * Core Patient Check-In Memory & Compliance Pipeline
 * SERVER-SIDE ONLY.
 * 
 * Orchestrates end-to-end check-in processing:
 * 1. Save raw check-in record in MongoDB
 * 2. Perform Groq NLP extraction (dose, delay, symptoms, concomitant meds, distress)
 * 3. Update check-in record with extracted payload
 * 4. Retain observation in patient's Hindsight memory bank
 * 5. Recall prior patient history & reflect on longitudinal patient trajectory
 * 6. Evaluate deterministic protocol rules against current + historical context
 * 7. Create & persist ComplianceLog in MongoDB
 * 8. Log immutable AuditEvent
 */

import { connectToDatabase } from '@/lib/mongodb';
import { buildBankId } from '@/lib/hindsight';
import {
  CheckInModel,
  ComplianceLogModel,
  AuditEventModel,
  PatientModel,
  ProtocolModel,
  ICheckInDocument,
  IComplianceLogDocument,
} from '@/models';
import { extractCheckInData } from './groq-extractor';
import {
  retainPatientObservation,
  recallPatientMemory,
  reflectOnPatientState,
} from './hindsight-memory';
import { evaluateProtocolRules, ProtocolEvaluationResult } from './protocol-engine';
import { CheckInExtraction } from '@/lib/schemas/checkin-extraction';

export interface ProcessCheckInInput {
  patientId: string;
  trialId: string;
  rawResponse: string;
  dayNumber: number;
  channel?: 'SMS' | 'WEB_FORM' | 'CLINICAL_VOICE' | 'COORDINATOR_NOTE';
  timestamp?: Date | string;
}

export interface ProcessCheckInOutput {
  checkIn: ICheckInDocument;
  extraction: CheckInExtraction;
  hindsight: {
    retained: boolean;
    recalledFacts: string[];
    reflectionSummary: string;
    mode: 'live' | 'mock';
  };
  evaluation: ProtocolEvaluationResult;
  complianceLog: IComplianceLogDocument;
}

export async function processPatientCheckIn(
  input: ProcessCheckInInput
): Promise<ProcessCheckInOutput> {
  let dbReady = false;

  try {
    if (process.env.MONGODB_MODE !== 'mock' && process.env.MONGODB_URI) {
      await connectToDatabase();
      dbReady = true;
    }
  } catch (err) {
    console.warn('[checkin-pipeline] MongoDB connection warning:', err);
  }

  const { patientId, trialId, rawResponse, dayNumber, channel = 'WEB_FORM' } = input;
  const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
  const checkInId = `CHK-${patientId}-${dayNumber}-${Date.now()}`;

  // 1. Initial Check-In Record Creation
  let checkInDoc: ICheckInDocument;
  try {
    checkInDoc = new CheckInModel({
      checkInId,
      patientId,
      trialId,
      timestamp,
      dayNumber,
      rawResponse,
      channel,
      extractedData: {
        doseTaken: true,
        symptoms: [],
        concomitantMedications: [],
        distressScore: 0,
      },
    });
  } catch {
    // Fallback if Mongoose instance without DB connection
    checkInDoc = {
      checkInId,
      patientId,
      trialId,
      timestamp,
      dayNumber,
      rawResponse,
      channel,
      extractedData: {
        doseTaken: true,
        symptoms: [],
        concomitantMedications: [],
        distressScore: 0,
      },
    } as unknown as ICheckInDocument;
  }

  // 2. Groq Structured NLP Extraction
  const extractionResult = await extractCheckInData(rawResponse);
  const extracted = extractionResult.data;

  // 3. Update Check-In Record with Extracted Payload
  checkInDoc.extractedData = extracted;
  if (dbReady && typeof (checkInDoc as unknown as { save?: () => Promise<unknown> }).save === 'function') {
    try {
      await (checkInDoc as unknown as { save: () => Promise<unknown> }).save();
    } catch (e) {
      console.warn('[checkin-pipeline] CheckIn save warning:', e);
    }
  }

  // 4. Hindsight Memory Retention
  const tags: string[] = ['checkin', `day_${dayNumber}`];
  if (!extracted.doseTaken) tags.push('missed_dose', 'non_compliance');
  extracted.symptoms.forEach((s) => tags.push(`symptom_${s.name}`));
  extracted.concomitantMedications.forEach((m) => tags.push(`med_${m.name.toLowerCase()}`));

  let retainRes;
  try {
    retainRes = await retainPatientObservation(trialId, patientId, rawResponse, {
      timestamp,
      tags,
      metadata: {
        checkInId,
        dayNumber: String(dayNumber),
        doseTaken: String(extracted.doseTaken),
      },
    });
  } catch (error) {
    console.warn('[checkin-pipeline] Hindsight retain warning:', error instanceof Error ? error.message : error);
    retainRes = {
      ok: false,
      bankId: buildBankId(trialId, patientId),
      mode: 'live' as const,
      message: 'Hindsight retention is pending because the memory service is unavailable.',
    };
  }

  if (retainRes.operationId && typeof checkInDoc.set === 'function') {
    checkInDoc.hindsightOperationId = retainRes.operationId;
  }

  // 5. Hindsight Recall & Reflect (Longitudinal History Search)
  let recallRes;
  try {
    recallRes = await recallPatientMemory(
      trialId,
      patientId,
      'What symptoms, adverse events, or dose issues did the patient report in previous check-ins?'
    );
  } catch (error) {
    console.warn('[checkin-pipeline] Hindsight recall warning:', error instanceof Error ? error.message : error);
    recallRes = { results: [] };
  }

  let reflectRes;
  try {
    reflectRes = await reflectOnPatientState(
      trialId,
      patientId,
      'Summarize patient longitudinal safety trajectory and dose adherence.'
    );
  } catch (error) {
    console.warn('[checkin-pipeline] Hindsight reflect warning:', error instanceof Error ? error.message : error);
    reflectRes = {
      answer: 'Longitudinal memory synthesis is pending because the memory service is unavailable.',
    };
  }

  const recalledFacts = recallRes.results.map((r) => r.text);
  const reflectionSummary = reflectRes.answer;

  // 6. Protocol Rules Engine Evaluation
  // Fetch Protocol from DB if available, else use default Protocol rules
  let protocolObj;
  if (dbReady) {
    try {
      protocolObj = await ProtocolModel.findOne({ protocolId: trialId }).lean();
    } catch {
      protocolObj = null;
    }
  }

  const protocolToUse = protocolObj ?? {
    protocolId: trialId,
    title: 'Trial Protocol',
    phase: 'Phase II' as const,
    indication: 'General',
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
        category: 'DOSING_TIMING' as const,
        name: 'Dosing Time Window',
        description: 'Allowed window +-120 min',
        severity: 'MEDIUM' as const,
        parameters: { maxAllowedWindowMinutes: 120 },
      },
      {
        ruleId: 'RULE-MED-001',
        category: 'PROHIBITED_MEDICATION' as const,
        name: 'Prohibited NSAIDs',
        description: 'Ibuprofen and Aspirin prohibited',
        severity: 'CRITICAL' as const,
        parameters: { prohibitedSubstances: ['ibuprofen', 'aspirin', 'naproxen'] },
      },
      {
        ruleId: 'RULE-AE-001',
        category: 'ADVERSE_EVENT_GRADE' as const,
        name: 'Adverse Event Grade Threshold',
        description: 'Grade 3+ or moderate vomiting/fever',
        severity: 'HIGH' as const,
        parameters: {},
      },
      {
        ruleId: 'RULE-MISSED-001',
        category: 'DOSING_AMOUNT' as const,
        name: 'Missed Dose',
        description: 'Missed dose review',
        severity: 'HIGH' as const,
        parameters: {},
      },
    ],
  };

  const evaluation = evaluateProtocolRules(extracted, protocolToUse);

  // 7. Persist ComplianceLog in MongoDB
  const logId = `LOG-${patientId}-${dayNumber}-${Date.now()}`;
  let complianceLogDoc: IComplianceLogDocument;

  try {
    complianceLogDoc = new ComplianceLogModel({
      logId,
      checkInId,
      patientId,
      trialId,
      evaluatedAt: new Date(),
      overallStatus: evaluation.overallStatus,
      violations: evaluation.violations,
      hindsightEvidence: recalledFacts,
      reflectionsSummary: reflectionSummary,
      requiresCoordinatorAction: evaluation.requiresCoordinatorAction,
    });

    if (process.env.MONGODB_URI && typeof (complianceLogDoc as unknown as { save?: () => Promise<unknown> }).save === 'function') {
      await (complianceLogDoc as unknown as { save: () => Promise<unknown> }).save();
    }
  } catch {
    complianceLogDoc = {
      logId,
      checkInId,
      patientId,
      trialId,
      evaluatedAt: new Date(),
      overallStatus: evaluation.overallStatus,
      violations: evaluation.violations,
      hindsightEvidence: recalledFacts,
      reflectionsSummary: reflectionSummary,
      requiresCoordinatorAction: evaluation.requiresCoordinatorAction,
    } as unknown as IComplianceLogDocument;
  }

  // Update patient status if safety violation
  if (dbReady && evaluation.overallStatus === 'SAFETY_VIOLATION') {
    try {
      await PatientModel.findOneAndUpdate(
        { patientId },
        { status: 'safety_hold' }
      );
    } catch (e) {
      console.warn('[checkin-pipeline] Patient status update warning:', e);
    }
  }

  // 8. Log Audit Event
  if (dbReady) {
    try {
      await AuditEventModel.create({
        eventId: `AUD-${Date.now()}`,
        action: 'CHECKIN_PROCESSED',
        actor: 'compliance_pipeline_agent',
        trialId,
        patientId,
        details: {
          checkInId,
          logId,
          status: evaluation.overallStatus,
          violationCount: evaluation.violations.length,
          requiresCoordinatorAction: evaluation.requiresCoordinatorAction,
        },
        hindsightBankId: retainRes.bankId,
      });
    } catch (e) {
      console.warn('[checkin-pipeline] AuditEvent save warning:', e);
    }
  }

  return {
    checkIn: checkInDoc,
    extraction: extracted,
    hindsight: {
      retained: retainRes.ok,
      recalledFacts,
      reflectionSummary,
      mode: retainRes.mode,
    },
    evaluation,
    complianceLog: complianceLogDoc,
  };
}
