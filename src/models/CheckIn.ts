import mongoose, { Schema, Document, Model } from 'mongoose';
import { CheckInData } from '@/types';

export interface ICheckInDocument extends Omit<CheckInData, 'timestamp'>, Document {
  timestamp: Date;
}

const ExtractedSymptomSchema = new Schema(
  {
    name: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: ['mild', 'moderate', 'severe', 'life_threatening'],
    },
    onsetTimestamp: { type: String },
    durationHours: { type: Number },
    resolved: { type: Boolean, default: false },
  },
  { _id: false }
);

const ExtractedMedicationSchema = new Schema(
  {
    name: { type: String, required: true },
    dose: { type: String },
    frequency: { type: String },
    reason: { type: String },
  },
  { _id: false }
);

const CheckInSchema = new Schema<ICheckInDocument>(
  {
    checkInId: { type: String, required: true, unique: true, index: true },
    patientId: { type: String, required: true, index: true },
    trialId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    dayNumber: { type: Number, required: true },
    rawResponse: { type: String, required: true },
    channel: {
      type: String,
      required: true,
      enum: ['SMS', 'WEB_FORM', 'CLINICAL_VOICE', 'COORDINATOR_NOTE'],
      default: 'WEB_FORM',
    },
    extractedData: {
      doseTaken: { type: Boolean, required: true },
      doseTimestamp: { type: String },
      doseDelayMinutes: { type: Number, default: 0 },
      symptoms: { type: [ExtractedSymptomSchema], default: [] },
      concomitantMedications: { type: [ExtractedMedicationSchema], default: [] },
      distressScore: { type: Number, min: 0, max: 10 },
      additionalNotes: { type: String },
    },
    hindsightOperationId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index for chronological patient check-in timeline queries
CheckInSchema.index({ patientId: 1, dayNumber: 1 });
CheckInSchema.index({ patientId: 1, timestamp: -1 });

export const CheckInModel: Model<ICheckInDocument> =
  mongoose.models.CheckIn || mongoose.model<ICheckInDocument>('CheckIn', CheckInSchema);
