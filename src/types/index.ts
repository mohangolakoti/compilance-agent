/**
 * Core Domain Type Definitions for Hindsight Clinical Trial Compliance Agent
 */

export type PatientStatus = 'enrolled' | 'active' | 'safety_hold' | 'withdrawn' | 'completed';

export type ComplianceStatus =
  | 'COMPLIANT'
  | 'NON_COMPLIANT'
  | 'ADVERSE_EVENT'
  | 'SAFETY_VIOLATION'
  | 'REQUIRES_HUMAN_REVIEW';

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RuleCategory =
  | 'DOSING_TIMING'
  | 'DOSING_AMOUNT'
  | 'PROHIBITED_MEDICATION'
  | 'ADVERSE_EVENT_GRADE'
  | 'LAB_THRESHOLD'
  | 'SCHEDULED_VISIT'
  | 'PATIENT_REPORTED_OUTCOME';

export interface ProtocolRule {
  ruleId: string;
  category: RuleCategory;
  name: string;
  description: string;
  severity: ViolationSeverity;
  parameters: {
    maxAllowedWindowMinutes?: number;
    prohibitedSubstances?: string[];
    gradeThresholds?: Record<string, number>;
    maxMissedDosesConsecutive?: number;
    requiredVitalsMinMax?: Record<string, { min?: number; max?: number }>;
  };
}

export interface TrialProtocolData {
  protocolId: string;
  title: string;
  phase: 'Phase I' | 'Phase II' | 'Phase III' | 'Phase IV';
  indication: string;
  investigationalProduct: string;
  dosingSchedule: {
    frequency: string;
    targetTimeOfDay?: string;
    allowedWindowMinutes: number;
    withFood: boolean;
  };
  rules: ProtocolRule[];
  version: number;
  isActive: boolean;
}

export interface PatientData {
  patientId: string;
  trialId: string;
  hindsightBankId: string;
  status: PatientStatus;
  enrolledAt: Date | string;
  cohort: string;
  treatmentArm: string;
  demographics?: {
    age?: number;
    gender?: string;
  };
  baselineVitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    weightKg?: number;
  };
}

export interface ExtractedSymptom {
  name: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  onsetTimestamp?: string;
  durationHours?: number;
  resolved?: boolean;
}

export interface ExtractedMedication {
  name: string;
  dose?: string;
  frequency?: string;
  reason?: string;
}

export interface ExtractedCheckInData {
  doseTaken: boolean;
  doseTimestamp?: string | null;
  doseDelayMinutes?: number;
  symptoms: ExtractedSymptom[];
  concomitantMedications: ExtractedMedication[];
  distressScore?: number; // 0 to 10
  additionalNotes?: string;
}

export interface CheckInData {
  checkInId: string;
  patientId: string;
  trialId: string;
  timestamp: Date | string;
  dayNumber: number;
  rawResponse: string;
  channel: 'SMS' | 'WEB_FORM' | 'CLINICAL_VOICE' | 'COORDINATOR_NOTE';
  extractedData: ExtractedCheckInData;
  hindsightOperationId?: string;
}

export interface ProtocolViolation {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: ViolationSeverity;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface ComplianceLogData {
  logId: string;
  checkInId: string;
  patientId: string;
  trialId: string;
  evaluatedAt: Date | string;
  overallStatus: ComplianceStatus;
  violations: ProtocolViolation[];
  hindsightEvidence: string[];
  reflectionsSummary?: string;
  requiresCoordinatorAction: boolean;
  coordinatorActionTaken?: {
    action: string;
    takenBy: string;
    takenAt: Date | string;
    notes?: string;
  };
}

export interface AuditEventData {
  eventId: string;
  action: string;
  actor: string;
  timestamp: Date | string;
  trialId?: string;
  patientId?: string;
  details: Record<string, unknown>;
  hindsightBankId?: string;
}
