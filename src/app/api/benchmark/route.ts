import { NextResponse } from 'next/server';
import { generateSyntheticDataset } from '@/services/synthetic-dataset';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dataset = generateSyntheticDataset('CT-2026-X');

  return NextResponse.json({
    ok: true,
    trialId: dataset.trialId,
    patientCount: dataset.patientCount,
    benchmarkQuestions: dataset.benchmarkQuestions,
    patients: dataset.patients.map((patient) => ({
      patientId: patient.patientId,
      status: patient.status,
      cohort: patient.cohort,
      treatmentArm: patient.treatmentArm,
      adherence: patient.adherence,
      memoryNotes: patient.memoryNotes,
      recentCheckIns: patient.checkIns.slice(-2),
    })),
  });
}
