/**
 * Phase 6 — Core Memory Pipeline Integration Test Script
 * 
 * Demonstrates 4-day longitudinal patient check-in processing:
 * Day 1: Baseline compliant check-in
 * Day 2: Mild nausea reported
 * Day 3: Moderate vomiting + Prohibited Ibuprofen ingested
 * Day 4: Dose SKIPPED + Prohibited Aspirin + Hindsight longitudinal memory synthesis
 */

import { processPatientCheckIn } from '../src/services/checkin-pipeline';

async function runCheckInPipelineTest() {
  console.log('====================================================');
  console.log('🧪 CORE MEMORY PIPELINE LONGITUDINAL TEST (PHASE 6)');
  console.log('====================================================\n');

  const trialId = 'CT-2026-X';
  const patientId = 'PATIENT-E2E-1';

  const checkIns = [
    {
      day: 1,
      text: 'Took my morning dose at 8:15 AM with breakfast. Baseline vitals fine, feeling good.',
    },
    {
      day: 2,
      text: 'Took dose at 8:30 AM. Experienced mild nausea around 10 AM, took light snack.',
    },
    {
      day: 3,
      text: 'Took dose at 9:30 AM. Experienced moderate vomiting at 11 AM and took Ibuprofen 400mg for headache.',
    },
    {
      day: 4,
      text: 'Skipped morning dose today because I threw up yesterday and was afraid. Took aspirin for pain.',
    },
  ];

  for (const item of checkIns) {
    console.log(`\n====================================================`);
    console.log(`📅 DAY ${item.day} CHECK-IN PROCESSING`);
    console.log(`====================================================`);
    console.log(`Patient Response: "${item.text}"`);

    const result = await processPatientCheckIn({
      patientId,
      trialId,
      rawResponse: item.text,
      dayNumber: item.day,
      channel: 'WEB_FORM',
    });

    console.log(`\n1️⃣ GROQ EXTRACTION RESULT:`);
    console.log(`   Dose Taken:      ${result.extraction.doseTaken ? 'YES' : 'NO (SKIPPED)'}`);
    console.log(`   Dose Timestamp:  ${result.extraction.doseTimestamp ?? 'N/A'}`);
    console.log(`   Delay Minutes:   ${result.extraction.doseDelayMinutes} min`);
    console.log(`   Distress Score:  ${result.extraction.distressScore} / 10`);
    console.log(`   Symptoms:        ${result.extraction.symptoms.map((s) => `${s.name} (${s.severity})`).join(', ') || 'None'}`);
    console.log(`   Concomitant Meds:${result.extraction.concomitantMedications.map((m) => m.name).join(', ') || 'None'}`);

    console.log(`\n2️⃣ HINDSIGHT LONGITUDINAL MEMORY:`);
    console.log(`   Memory Retained: ${result.hindsight.retained ? 'YES' : 'NO'}`);
    console.log(`   Recalled Facts (${result.hindsight.recalledFacts.length}):`);
    result.hindsight.recalledFacts.forEach((f, idx) => console.log(`     ${idx + 1}. ${f}`));

    console.log(`\n3️⃣ PROTOCOL ENGINE EVALUATION:`);
    console.log(`   Overall Status:             [${result.evaluation.overallStatus}]`);
    console.log(`   Requires Coordinator Alert: ${result.evaluation.requiresCoordinatorAction ? '⚠️ YES' : '✅ NO'}`);
    console.log(`   Violations (${result.evaluation.violations.length}):`);
    result.evaluation.violations.forEach((v, idx) => {
      console.log(`     - [${v.severity}] ${v.ruleName}: ${v.description}`);
      console.log(`       Action: ${v.recommendation}`);
    });
  }

  console.log('\n====================================================');
  console.log('🎉 CORE MEMORY PIPELINE TEST COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runCheckInPipelineTest().catch((err) => {
  console.error('❌ Check-In Pipeline Test Error:', err);
  process.exit(1);
});
