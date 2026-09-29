/**
 * Database Seed Script for Hindsight Clinical Trial Compliance Agent
 * 
 * Populates synthetic clinical trial protocols, patient profiles, and check-ins.
 * Connects to MongoDB Atlas if MONGODB_URI is provided.
 */

import { connectToDatabase } from '../src/lib/mongodb';
import {
  ProtocolModel,
  PatientModel,
  CheckInModel,
  AuditEventModel,
} from '../src/models';
import { buildBankId } from '../src/lib/hindsight';

export async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 SEEDING DATABASE (PHASE 3)');
  console.log('====================================================\n');

  let isConnected = false;
  try {
    if (process.env.MONGODB_URI) {
      await connectToDatabase();
      isConnected = true;
      console.log('✅ Connected to MongoDB Atlas.');
    } else {
      console.log('⚠️ MONGODB_URI not set. Running seed generation in dry-run mode.');
    }
  } catch (err) {
    console.warn('⚠️ MongoDB connection warning. Continuing dry-run seed validation:', err);
  }

  // 1. Synthetic Trial Protocol: CT-2026-X
  const protocolId = 'CT-2026-X';
  const protocolData = {
    protocolId,
    title: 'Phase II Clinical Trial of Investigational Drug X in Advanced Solid Tumors',
    phase: 'Phase II' as const,
    indication: 'Advanced Solid Tumors',
    investigationalProduct: 'Protocol Drug X 100mg',
    dosingSchedule: {
      frequency: 'Once daily in morning',
      targetTimeOfDay: '08:00 AM',
      allowedWindowMinutes: 120, // +- 2 hours
      withFood: true,
    },
    version: 1,
    isActive: true,
    rules: [
      {
        ruleId: 'RULE-DOSE-001',
        category: 'DOSING_TIMING' as const,
        name: 'Dosing Time Window',
        description: 'Dose must be taken within +-120 minutes of 08:00 AM.',
        severity: 'MEDIUM' as const,
        parameters: { maxAllowedWindowMinutes: 120 },
      },
      {
        ruleId: 'RULE-MED-001',
        category: 'PROHIBITED_MEDICATION' as const,
        name: 'Prohibited NSAIDs and CYP3A4 Inhibitors',
        description: 'Concomitant use of high-dose aspirin, ibuprofen, naproxen, or ketoconazole is strictly prohibited.',
        severity: 'CRITICAL' as const,
        parameters: { prohibitedSubstances: ['ibuprofen', 'naproxen', 'aspirin', 'ketoconazole'] },
      },
      {
        ruleId: 'RULE-AE-001',
        category: 'ADVERSE_EVENT_GRADE' as const,
        name: 'Grade 3+ Vomiting or Grade 2+ Fever',
        description: 'Severe vomiting or fever > 38.5C requires dose pause and site notification.',
        severity: 'HIGH' as const,
        parameters: { gradeThresholds: { vomiting: 3, fever: 2 } },
      },
      {
        ruleId: 'RULE-MISSED-001',
        category: 'DOSING_AMOUNT' as const,
        name: 'Consecutive Missed Doses',
        description: 'More than 1 consecutive missed dose triggers non-compliance review.',
        severity: 'HIGH' as const,
        parameters: { maxMissedDosesConsecutive: 1 },
      },
    ],
  };

  // 2. Synthetic Patients
  const trialId = protocolId;
  const patientsData = [
    {
      patientId: 'PATIENT-101',
      trialId,
      hindsightBankId: buildBankId(trialId, 'PATIENT-101'),
      status: 'active' as const,
      enrolledAt: new Date('2026-09-01'),
      cohort: 'Cohort A',
      treatmentArm: 'Arm A (Drug X 100mg)',
      demographics: { age: 58, gender: 'Female' },
      baselineVitals: { systolicBP: 122, diastolicBP: 78, heartRate: 72, weightKg: 64.5 },
    },
    {
      patientId: 'PATIENT-102',
      trialId,
      hindsightBankId: buildBankId(trialId, 'PATIENT-102'),
      status: 'active' as const,
      enrolledAt: new Date('2026-09-03'),
      cohort: 'Cohort A',
      treatmentArm: 'Arm A (Drug X 100mg)',
      demographics: { age: 64, gender: 'Male' },
      baselineVitals: { systolicBP: 135, diastolicBP: 85, heartRate: 76, weightKg: 82.0 },
    },
    {
      patientId: 'PATIENT-103',
      trialId,
      hindsightBankId: buildBankId(trialId, 'PATIENT-103'),
      status: 'safety_hold' as const,
      enrolledAt: new Date('2026-08-15'),
      cohort: 'Cohort B',
      treatmentArm: 'Arm B (Drug X 150mg High Dose)',
      demographics: { age: 51, gender: 'Female' },
      baselineVitals: { systolicBP: 118, diastolicBP: 74, heartRate: 68, weightKg: 58.2 },
    },
  ];

  // 3. Initial Check-in records for PATIENT-101
  const checkInsData = [
    {
      checkInId: 'CHK-101-01',
      patientId: 'PATIENT-101',
      trialId,
      timestamp: new Date('2026-09-25T08:15:00Z'),
      dayNumber: 1,
      rawResponse: 'Took morning dose at 8:15 AM with breakfast. Feeling good, no nausea.',
      channel: 'WEB_FORM' as const,
      extractedData: {
        doseTaken: true,
        doseTimestamp: '2026-09-25T08:15:00Z',
        doseDelayMinutes: 15,
        symptoms: [],
        concomitantMedications: [],
        distressScore: 1,
      },
    },
    {
      checkInId: 'CHK-101-02',
      patientId: 'PATIENT-101',
      trialId,
      timestamp: new Date('2026-09-26T08:45:00Z'),
      dayNumber: 2,
      rawResponse: 'Dose taken at 8:45 AM. Mild nausea around 10 AM, took light snack.',
      channel: 'WEB_FORM' as const,
      extractedData: {
        doseTaken: true,
        doseTimestamp: '2026-09-26T08:45:00Z',
        doseDelayMinutes: 45,
        symptoms: [{ name: 'nausea', severity: 'mild' as const, durationHours: 2 }],
        concomitantMedications: [],
        distressScore: 3,
      },
    },
    {
      checkInId: 'CHK-101-03',
      patientId: 'PATIENT-101',
      trialId,
      timestamp: new Date('2026-09-27T09:30:00Z'),
      dayNumber: 3,
      rawResponse: 'Took dose at 9:30 AM. Experienced moderate vomiting at 11 AM and took Ibuprofen for headache.',
      channel: 'WEB_FORM' as const,
      extractedData: {
        doseTaken: true,
        doseTimestamp: '2026-09-27T09:30:00Z',
        doseDelayMinutes: 90,
        symptoms: [{ name: 'vomiting', severity: 'moderate' as const, durationHours: 1 }],
        concomitantMedications: [{ name: 'ibuprofen', dose: '400mg', reason: 'headache' }],
        distressScore: 6,
      },
    },
  ];

  if (isConnected) {
    // Upsert Protocol
    await ProtocolModel.findOneAndUpdate({ protocolId }, protocolData, { upsert: true, new: true });
    console.log(`✅ Protocol ${protocolId} upserted into MongoDB.`);

    // Upsert Patients
    for (const p of patientsData) {
      await PatientModel.findOneAndUpdate({ patientId: p.patientId }, p, { upsert: true, new: true });
    }
    console.log(`✅ ${patientsData.length} Patients upserted into MongoDB.`);

    // Upsert CheckIns
    for (const c of checkInsData) {
      await CheckInModel.findOneAndUpdate({ checkInId: c.checkInId }, c, { upsert: true, new: true });
    }
    console.log(`✅ ${checkInsData.length} CheckIns upserted into MongoDB.`);

    // Audit event
    await AuditEventModel.create({
      eventId: `AUD-${Date.now()}`,
      action: 'DATABASE_SEEDED',
      actor: 'system',
      trialId,
      details: { protocolId, patientCount: patientsData.length, checkInCount: checkInsData.length },
    });
    console.log('✅ AuditEvent recorded.');
  }

  console.log('\n====================================================');
  console.log('🎉 PHASE 3 SEED GENERATION COMPLETE');
  console.log('====================================================');
  return { protocolData, patientsData, checkInsData };
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed database error:', err);
      process.exit(1);
    });
}
