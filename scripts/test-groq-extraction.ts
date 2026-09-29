/**
 * Phase 4 — Groq Structured Extraction Integration Test Script
 * 
 * Tests parsing informal patient check-in reports into structured Zod-validated payloads.
 */

import { extractCheckInData } from '../src/services/groq-extractor';

async function runGroqExtractionTest() {
  console.log('====================================================');
  console.log('🧪 GROQ STRUCTURED EXTRACTION TEST (PHASE 4)');
  console.log('====================================================\n');

  const testUtterances = [
    {
      case: 'Case 1: Fully Compliant Baseline',
      text: 'Took my morning dose at 8:15 AM with breakfast. Feeling good, no symptoms!',
    },
    {
      case: 'Case 2: Mild Delay + Mild Nausea',
      text: 'Took the pill around 9:30 AM. Had some mild nausea for about 2 hours after.',
    },
    {
      case: 'Case 3: Moderate Vomiting + Prohibited Medication (Ibuprofen)',
      text: 'Took dose at 9:30 AM. Experienced moderate vomiting at 11 AM and took Ibuprofen 400mg for headache.',
    },
    {
      case: 'Case 4: Dose Skipped + Distress + Aspirin',
      text: 'Skipped morning dose today because I threw up yesterday and was afraid. Took aspirin for pain.',
    },
    {
      case: 'Case 5: Severe Fever + Dizziness',
      text: 'Took my medicine at 8 AM. Severe fever 39.2C started around 2 PM and feeling extremely dizzy.',
    },
  ];

  for (const item of testUtterances) {
    console.log(`----------------------------------------------------`);
    console.log(`📌 ${item.case}`);
    console.log(`   Utterance: "${item.text}"`);

    const result = await extractCheckInData(item.text);

    console.log(`   Extraction Mode: ${result.mode.toUpperCase()}`);
    console.log(`   Dose Taken:      ${result.data.doseTaken ? 'YES' : 'NO (SKIPPED)'}`);
    console.log(`   Dose Timestamp:  ${result.data.doseTimestamp ?? 'None'}`);
    console.log(`   Delay Minutes:   ${result.data.doseDelayMinutes} min`);
    console.log(`   Distress Score:  ${result.data.distressScore} / 10`);

    if (result.data.symptoms.length > 0) {
      console.log(`   Symptoms (${result.data.symptoms.length}):`);
      result.data.symptoms.forEach((s) => console.log(`     - ${s.name} [severity=${s.severity}]`));
    } else {
      console.log(`   Symptoms: None`);
    }

    if (result.data.concomitantMedications.length > 0) {
      console.log(`   Concomitant Meds (${result.data.concomitantMedications.length}):`);
      result.data.concomitantMedications.forEach((m) => console.log(`     - ${m.name} ${m.dose ? `(${m.dose})` : ''}`));
    } else {
      console.log(`   Concomitant Meds: None`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 GROQ EXTRACTION TEST COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

runGroqExtractionTest().catch((err) => {
  console.error('❌ Groq Extraction Test Error:', err);
  process.exit(1);
});
