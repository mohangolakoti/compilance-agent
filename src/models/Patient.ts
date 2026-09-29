import mongoose, { Schema, Document, Model } from 'mongoose';
import { PatientData } from '@/types';

export interface IPatientDocument extends Omit<PatientData, 'enrolledAt'>, Document {
  enrolledAt: Date;
}

const PatientSchema = new Schema<IPatientDocument>(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    trialId: { type: String, required: true, index: true },
    hindsightBankId: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ['enrolled', 'active', 'safety_hold', 'withdrawn', 'completed'],
      default: 'enrolled',
      index: true,
    },
    enrolledAt: { type: Date, required: true, default: Date.now },
    cohort: { type: String, required: true, default: 'Standard Cohort' },
    treatmentArm: { type: String, required: true, default: 'Arm A (Active)' },
    demographics: {
      age: { type: Number },
      gender: { type: String },
    },
    baselineVitals: {
      systolicBP: { type: Number },
      diastolicBP: { type: Number },
      heartRate: { type: Number },
      weightKg: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying patients by trial & status
PatientSchema.index({ trialId: 1, status: 1 });

export const PatientModel: Model<IPatientDocument> =
  mongoose.models.Patient || mongoose.model<IPatientDocument>('Patient', PatientSchema);
