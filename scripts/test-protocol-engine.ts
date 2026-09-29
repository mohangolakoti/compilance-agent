/**
 * Phase 5 — Deterministic Protocol Engine Integration Test Script
 * 
 * Evaluates extracted check-ins against Protocol CT-2026-X rules.
 */

import { evaluateProtocolRules } from '../src/services/protocol-engine';
import { extractCheckInData } from '../src/services/groq-extractor';
import { TrialProtocolData } from '../src/types';

const mockProtocol: TrialProtocolData = {
  protocolId: 'CT-2026-X',
  title: 'Phase II Clinical Trial of Investigational Drug X',
  phase: 'Phase II',
  indication: 'Solid Tumors',
  investigationalProduct: 'Drug X 100mg',
  dosingSchedule: {
    frequency: 'Once daily in morning',
    targetTimeOfDay: '08:00 AM',
    allowedWindowMinutes: 120, // +- 2h
    withFood: true,
  },
  version: 1,
  isActive: true,
  rules: [
    {
      ruleId: 'RULE-DOSE-001',
      category: 'DOSING_TIMING',
      name: 'Dosing Time Window',
      description: 'Dose must be taken within +-120 min of 08:00 AM.',
      severity: 'MEDIUM',
      parameters: { maxAllowedWindowMinutes: 120 },
    },
    {
      ruleId: 'RULE-MED-001',
      category: 'PROHIBITED_MEDICATION',
      name: 'Prohibited NSAIDs and CYP3A4 Inhibitors',
      description: 'Use of high-dose aspirin, ibuprofen, naproxen is strictly prohibited.',
      severity: 'CRITICAL',
      parameters: { prohibitedSubstances: ['ibuprofen', 'naproxen', 'aspirin', 'ketoconazole'] },
    },
    {
      ruleId: 'RULE-AE-001',
      category: 'ADVERSE_EVENT_GRADE',
      name: 'Grade 3+ AE or Moderate Vomiting/Fever',
      description: 'Severe symptoms or moderate vomiting require safety review.',
      severity: 'HIGH',
      parameters: { gradeThresholds: { vomiting: 2, fever: 2 } },
    },
    {
      ruleId: 'RULE-MISSED-001',
      category: 'DOSING_AMOUNT',
      name: 'Missed Doses',
      description: 'Missed doses trigger non-compliance review.',
      severity: 'HIGH',
      parameters: { maxMissedDosesConsecutive: 1 },
    },
  ],
};

async function runProtocolEngineTest() {
  console.log('====================================================');
  console.log('🧪 DETERMINISTIC PROTOCOL ENGINE TEST (PHASE 5)');
  console.log('====================================================\n');

  const testCases = [
    {
      name: 'Case 1: Fully Compliant Baseline',
      text: 'Took my morning dose at 8:15 AM with breakfast. Feeling good, no symptoms!',
    },
    {
      name: 'Case 2: 90 min Delay (Within 120 min allowed window)',
      text: 'Took the pill around 9:30 AM. Had some mild nausea for about 2 hours after.',
    },
    {
      name: 'Case 3: Moderate Vomiting + Prohibited NSAID (Ibuprofen)',
      text: 'Took dose at 9:30 AM. Experienced moderate vomiting at 11 AM and took Ibuprofen 400mg for headache.',
    },
    {
      name: 'Case 4: Skipped Dose + Distress + Aspirin',
      text: 'Skipped morning dose today because I threw up yesterday and was afraid. Took aspirin for pain.',
    },
    {
      name: 'Case 5: Severe Fever + Dizziness',
      text: 'Took my medicine at 8 AM. Severe fever 39.2C started around 2 PM and feeling extremely dizzy.',
    },
  ];

  for (const tc of testCases) {
    console.log(`----------------------------------------------------`);
    console.log(`📌 ${tc.name}`);
    console.log(`   Input: "${tc.text}"`);

    const extraction = await extractCheckInData(tc.text);
    const evaluation = evaluateProtocolRules(extraction.data, mockProtocol);

    console.log(`   Overall Status:             [${evaluation.overallStatus}]`);
    console.log(`   Requires Coordinator Alert: ${evaluation.requiresCoordinatorAction ? '⚠️ YES' : '✅ NO'}`);
    console.log(`   Violations Count:           ${evaluation.violations.length}`);

    evaluation.violations.forEach((v, idx) => {
      console.log(`     Violation ${idx + 1}: [${v.severity}] ${v.ruleName}`);
      console.log(`       - Description: ${v.description}`);
      console.log(`       - Evidence:    ${v.evidence}`);
      console.log(`       - Action Rec:  ${v.recommendation}`);
    });
  }

  console.log('\n====================================================');
  console.log('🎉 PROTOCOL ENGINE TEST COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runProtocolEngineTest().catch((err) => {
  console.error('❌ Protocol Engine Test Error:', err);
  process.exit(1);
});
