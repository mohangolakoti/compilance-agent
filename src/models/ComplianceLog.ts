import mongoose, { Schema, Document, Model } from 'mongoose';
import { ComplianceLogData } from '@/types';

export interface IComplianceLogDocument extends Omit<ComplianceLogData, 'evaluatedAt'>, Document {
  evaluatedAt: Date;
}

const ProtocolViolationSchema = new Schema(
  {
    ruleId: { type: String, required: true },
    ruleName: { type: String, required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'DOSING_TIMING',
        'DOSING_AMOUNT',
        'PROHIBITED_MEDICATION',
        'ADVERSE_EVENT_GRADE',
        'LAB_THRESHOLD',
        'SCHEDULED_VISIT',
        'PATIENT_REPORTED_OUTCOME',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    description: { type: String, required: true },
    evidence: { type: String, required: true },
    recommendation: { type: String, required: true },
  },
  { _id: false }
);

const ComplianceLogSchema = new Schema<IComplianceLogDocument>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    checkInId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    trialId: { type: String, required: true, index: true },
    evaluatedAt: { type: Date, required: true, default: Date.now, index: true },
    overallStatus: {
      type: String,
      required: true,
      enum: [
        'COMPLIANT',
        'NON_COMPLIANT',
        'ADVERSE_EVENT',
        'SAFETY_VIOLATION',
        'REQUIRES_HUMAN_REVIEW',
      ],
      index: true,
    },
    violations: { type: [ProtocolViolationSchema], default: [] },
    hindsightEvidence: { type: [String], default: [] },
    reflectionsSummary: { type: String },
    requiresCoordinatorAction: { type: Boolean, required: true, default: false, index: true },
    coordinatorActionTaken: {
      action: { type: String },
      takenBy: { type: String },
      takenAt: { type: Date },
      notes: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

ComplianceLogSchema.index({ patientId: 1, evaluatedAt: -1 });
ComplianceLogSchema.index({ trialId: 1, requiresCoordinatorAction: 1 });

export const ComplianceLogModel: Model<IComplianceLogDocument> =
  mongoose.models.ComplianceLog ||
  mongoose.model<IComplianceLogDocument>('ComplianceLog', ComplianceLogSchema);
