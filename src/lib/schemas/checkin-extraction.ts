import { z } from 'zod';

export const SymptomSeveritySchema = z.enum([
  'mild',
  'moderate',
  'severe',
  'life_threatening',
]);

export const ExtractedSymptomSchema = z.object({
  name: z.string().describe('Standardized symptom or adverse event name'),
  severity: SymptomSeveritySchema.describe('Symptom severity grade'),
  onsetTimestamp: z.string().optional().describe('ISO timestamp or time description of onset'),
  durationHours: z.number().optional().describe('Duration in hours if mentioned'),
  resolved: z.boolean().default(false).describe('Whether the symptom has resolved'),
});

export const ExtractedMedicationSchema = z.object({
  name: z.string().describe('Generic or brand name of medication ingested'),
  dose: z.string().optional().describe('Dose quantity e.g. 400mg'),
  frequency: z.string().optional().describe('Dosing frequency if mentioned'),
  reason: z.string().optional().describe('Stated reason for taking medication'),
});

export const CheckInExtractionSchema = z.object({
  doseTaken: z.boolean().describe('True if patient confirmed taking trial dose, false if skipped'),
  doseTimestamp: z.string().nullable().optional().describe('Reported dose time (ISO or HH:MM)'),
  doseDelayMinutes: z.number().default(0).describe('Estimated delay in minutes relative to target 08:00 AM'),
  symptoms: z.array(ExtractedSymptomSchema).default([]).describe('List of reported symptoms or adverse events'),
  concomitantMedications: z.array(ExtractedMedicationSchema).default([]).describe('List of non-protocol medications taken'),
  distressScore: z.number().min(0).max(10).default(0).describe('Subjective distress level 0-10'),
  additionalNotes: z.string().optional().describe('Clinical summary notes or patient quotes'),
});

export type CheckInExtraction = z.infer<typeof CheckInExtractionSchema>;
