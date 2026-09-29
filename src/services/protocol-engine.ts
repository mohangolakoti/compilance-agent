/**
 * Deterministic Protocol Rules Engine
 * SERVER-SIDE ONLY.
 * 
 * Evaluates extracted check-in data against trial protocol rules.
 * Produces structured compliance decisions, violation details, severity ratings,
 * and actionable recommendations for human clinical coordinators.
 */

import {
  TrialProtocolData,
  ComplianceStatus,
  ProtocolViolation,
  ViolationSeverity,
} from '@/types';
import { CheckInExtraction } from '@/lib/schemas/checkin-extraction';

export interface ProtocolEvaluationResult {
  overallStatus: ComplianceStatus;
  violations: ProtocolViolation[];
  requiresCoordinatorAction: boolean;
  summaryText: string;
}

/**
 * Evaluate extracted check-in data against a trial protocol.
 */
export function evaluateProtocolRules(
  extracted: CheckInExtraction,
  protocol: TrialProtocolData
): ProtocolEvaluationResult {
  const violations: ProtocolViolation[] = [];

  // 1. Dosing Amount / Missed Dose Check
  if (!extracted.doseTaken) {
    const missedRule = protocol.rules.find((r) => r.category === 'DOSING_AMOUNT');
    violations.push({
      ruleId: missedRule?.ruleId ?? 'RULE-MISSED-DOSE',
      ruleName: missedRule?.name ?? 'Missed Dose',
      category: 'DOSING_AMOUNT',
      severity: missedRule?.severity ?? 'HIGH',
      description: 'Patient reported skipping or missing the scheduled trial medication dose.',
      evidence: 'Check-in extracted doseTaken = false.',
      recommendation: 'Contact patient immediately to assess reason for skipped dose and reinforce protocol compliance.',
    });
  }

  // 2. Dosing Timing Check
  if (extracted.doseTaken && extracted.doseDelayMinutes > 0) {
    const allowedWindow = protocol.dosingSchedule.allowedWindowMinutes ?? 120;
    if (extracted.doseDelayMinutes > allowedWindow) {
      const timingRule = protocol.rules.find((r) => r.category === 'DOSING_TIMING');
      violations.push({
        ruleId: timingRule?.ruleId ?? 'RULE-DOSING-TIMING',
        ruleName: timingRule?.name ?? 'Dosing Timing Window Exceeded',
        category: 'DOSING_TIMING',
        severity: timingRule?.severity ?? 'MEDIUM',
        description: `Dose taken with ${extracted.doseDelayMinutes} minutes delay, exceeding the allowed window of ${allowedWindow} minutes.`,
        evidence: `Dose timestamp: ${extracted.doseTimestamp ?? 'delayed'}, delay: ${extracted.doseDelayMinutes} min vs target ${protocol.dosingSchedule.targetTimeOfDay ?? '08:00 AM'}.`,
        recommendation: 'Remind patient of target dosing window and investigate cause of delay.',
      });
    }
  }

  // 3. Prohibited Medication Check
  if (extracted.concomitantMedications.length > 0) {
    const medRule = protocol.rules.find((r) => r.category === 'PROHIBITED_MEDICATION');
    const prohibitedSubstances =
      (medRule?.parameters.prohibitedSubstances as string[] | undefined) ?? [
        'ibuprofen',
        'naproxen',
        'aspirin',
        'ketoconazole',
      ];

    for (const med of extracted.concomitantMedications) {
      const medNameLower = med.name.toLowerCase();
      const isProhibited = prohibitedSubstances.some((p) => medNameLower.includes(p.toLowerCase()));

      if (isProhibited) {
        violations.push({
          ruleId: medRule?.ruleId ?? 'RULE-PROHIBITED-MED',
          ruleName: medRule?.name ?? 'Prohibited Concomitant Medication Ingested',
          category: 'PROHIBITED_MEDICATION',
          severity: medRule?.severity ?? 'CRITICAL',
          description: `Patient reported taking prohibited concomitant medication: ${med.name}${med.dose ? ` (${med.dose})` : ''}.`,
          evidence: `Extracted concomitant medication: ${med.name}, reason: ${med.reason ?? 'not specified'}.`,
          recommendation: `CRITICAL: Instruct patient to DISCONTINUE ${med.name} immediately due to potential drug interaction or masking of trial endpoints.`,
        });
      }
    }
  }

  // 4. Adverse Event / Symptom Grade Check
  if (extracted.symptoms.length > 0) {
    const aeRule = protocol.rules.find((r) => r.category === 'ADVERSE_EVENT_GRADE');
    
    for (const symptom of extracted.symptoms) {
      const isSevere = symptom.severity === 'severe' || symptom.severity === 'life_threatening';
      const isModerateVomitingOrFever =
        symptom.severity === 'moderate' && (symptom.name === 'vomiting' || symptom.name === 'fever');

      if (isSevere || isModerateVomitingOrFever) {
        const severityRating: ViolationSeverity = isSevere ? 'CRITICAL' : 'HIGH';
        violations.push({
          ruleId: aeRule?.ruleId ?? 'RULE-AE-GRADE',
          ruleName: aeRule?.name ?? 'Significant Adverse Event Reported',
          category: 'ADVERSE_EVENT_GRADE',
          severity: severityRating,
          description: `Patient reported ${symptom.severity.toUpperCase()} symptom: ${symptom.name}.`,
          evidence: `Symptom "${symptom.name}" assessed at grade ${symptom.severity}.`,
          recommendation: isSevere
            ? 'SAFETY ALERT: Immediate medical evaluation required. Consider temporary safety hold on investigational product.'
            : 'Monitor symptom closely, provide supportive therapy, and check for progression in next 24h.',
        });
      }
    }
  }

  // Determine Overall Status
  let overallStatus: ComplianceStatus = 'COMPLIANT';

  const hasCritical = violations.some((v) => v.severity === 'CRITICAL');
  const hasHigh = violations.some((v) => v.severity === 'HIGH');
  const hasMedium = violations.some((v) => v.severity === 'MEDIUM');
  const hasSymptoms = extracted.symptoms.length > 0;

  if (hasCritical) {
    overallStatus = 'SAFETY_VIOLATION';
  } else if (hasHigh) {
    overallStatus = extracted.symptoms.some((s) => s.severity === 'moderate' || s.severity === 'severe')
      ? 'ADVERSE_EVENT'
      : 'NON_COMPLIANT';
  } else if (hasMedium || !extracted.doseTaken) {
    overallStatus = 'NON_COMPLIANT';
  } else if (hasSymptoms) {
    overallStatus = 'REQUIRES_HUMAN_REVIEW';
  }

  const requiresCoordinatorAction =
    overallStatus !== 'COMPLIANT' || violations.length > 0 || extracted.distressScore >= 5;

  const summaryParts: string[] = [];
  if (overallStatus === 'COMPLIANT') {
    summaryParts.push('Patient is fully compliant with trial protocol rules.');
  } else {
    summaryParts.push(`Evaluation Status: ${overallStatus}. Identified ${violations.length} protocol violation(s).`);
  }

  return {
    overallStatus,
    violations,
    requiresCoordinatorAction,
    summaryText: summaryParts.join(' '),
  };
}
