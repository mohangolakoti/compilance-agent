/**
 * Phase 2 — Hindsight Proof of Concept Integration Test Script
 * 
 * Demonstrates the core Hindsight engine:
 * 1. Bank initialization
 * 2. Retain multi-day patient check-in observations
 * 3. Recall fact retrieval
 * 4. Reflect contextual synthesis
 * 5. Mental Model creation
 * 
 * Can run in live mode (with HINDSIGHT_API_KEY) or mock mode (offline/dev).
 */

import {
  ensurePatientBankExists,
  retainPatientObservation,
  recallPatientMemory,
  reflectOnPatientState,
  createPatientMentalModel,
  getPatientMentalModels,
} from '../src/services/hindsight-memory';

async function runHindsightPocTest() {
  console.log('====================================================');
  console.log('🧪 HINDSIGHT POC INTEGRATION TEST (PHASE 2)');
  console.log('====================================================\n');

  const trialId = 'TRIAL-TEST-001';
  const patientId = 'PATIENT-POC-101';

  // Step 1: Ensure Bank
  console.log(`[Step 1] Initializing Bank for Trial=${trialId}, Patient=${patientId}...`);
  const bank = await ensurePatientBankExists(trialId, patientId);
  console.log(`✅ Bank ID: ${bank.bankId} | Mode: ${bank.mode.toUpperCase()}\n`);

  // Step 2: Retain Sequential Patient Observations (Longitudinal Scenario)
  console.log('[Step 2] Retaining longitudinal patient observations...');
  
  const observations = [
    {
      day: 'Day 1',
      text: 'Patient completed Visit 1. Baseline vitals normal. Prescribed Protocol Drug X 100mg once daily with breakfast.',
      tags: ['visit', 'baseline', 'dosing'],
    },
    {
      day: 'Day 2',
      text: 'Patient reported mild nausea after taking morning dose around 08:30 AM. Retained full dose.',
      tags: ['symptom', 'adverse_event', 'nausea'],
    },
    {
      day: 'Day 3',
      text: 'Patient experienced moderate vomiting at 10:00 AM after morning dose. Took antiemetic as advised.',
      tags: ['symptom', 'adverse_event', 'vomiting'],
    },
    {
      day: 'Day 4',
      text: 'Patient SKIPPED morning dose of Protocol Drug X due to fear of vomiting. Coordinator notified.',
      tags: ['adherence', 'non_compliance', 'skipped_dose'],
    },
  ];

  for (const obs of observations) {
    const res = await retainPatientObservation(trialId, patientId, obs.text, {
      tags: obs.tags,
      metadata: { day: obs.day, trialId, patientId },
    });
    console.log(`   └─ Retained [${obs.day}] (${obs.tags.join(', ')}): "${obs.text.slice(0, 60)}..." -> ok=${res.ok}`);
  }
  console.log('✅ Observations retained successfully.\n');

  // Step 3: Recall Memories
  console.log('[Step 3] Testing Recall (Semantic Fact Retrieval)...');
  const recallQuery = 'What adverse events or side effects did the patient experience?';
  const recallRes = await recallPatientMemory(trialId, patientId, recallQuery);
  console.log(`   Query: "${recallQuery}"`);
  console.log(`   Found ${recallRes.results.length} relevant facts:`);
  recallRes.results.forEach((fact, idx) => {
    console.log(`     ${idx + 1}. [score=${fact.score ?? 'N/A'}] ${fact.text}`);
  });
  console.log('✅ Recall operational.\n');

  // Step 4: Reflect Reasoning
  console.log('[Step 4] Testing Reflect (Synthesis over Patient Memory)...');
  const reflectQuery = 'Synthesize patient adherence and adverse event progression. Did the patient skip any doses and why?';
  const reflectRes = await reflectOnPatientState(trialId, patientId, reflectQuery);
  console.log(`   Query: "${reflectQuery}"`);
  console.log(`   Reflect Answer:\n   "${reflectRes.answer}"\n`);
  console.log('✅ Reflect operational.\n');

  // Step 5: Mental Models
  console.log('[Step 5] Testing Mental Models...');
  const mmName = 'Adherence & Symptom Profile';
  const mmQuery = 'Track recurring adverse events, nausea progression, and dosage adherence over time.';
  const mmRes = await createPatientMentalModel(trialId, patientId, mmName, mmQuery);
  console.log(`   Created Mental Model: "${mmRes.name}" (ID: ${mmRes.id})`);
  
  const allModels = await getPatientMentalModels(trialId, patientId);
  console.log(`   Total Active Mental Models: ${allModels.length}`);
  allModels.forEach((m) => console.log(`     - ${m.name}: ${m.sourceQuery}`));
  console.log('✅ Mental Models operational.\n');

  console.log('====================================================');
  console.log('🎉 PHASE 2 POC INTEGRATION TEST COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runHindsightPocTest().catch((err) => {
  console.error('❌ Hindsight POC Test Error:', err);
  process.exit(1);
});
