import mongoose, { Schema, Document, Model } from 'mongoose';
import { TrialProtocolData, ProtocolRule } from '@/types';

export interface IProtocolDocument extends Omit<TrialProtocolData, 'protocolId'>, Document {
  protocolId: string;
}

const ProtocolRuleSchema = new Schema<ProtocolRule>(
  {
    ruleId: { type: String, required: true },
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
    name: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    parameters: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ProtocolSchema = new Schema<IProtocolDocument>(
  {
    protocolId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    phase: {
      type: String,
      required: true,
      enum: ['Phase I', 'Phase II', 'Phase III', 'Phase IV'],
    },
    indication: { type: String, required: true },
    investigationalProduct: { type: String, required: true },
    dosingSchedule: {
      frequency: { type: String, required: true },
      targetTimeOfDay: { type: String },
      allowedWindowMinutes: { type: Number, required: true, default: 120 },
      withFood: { type: Boolean, required: true, default: false },
    },
    rules: { type: [ProtocolRuleSchema], default: [] },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
  }
);

export const ProtocolModel: Model<IProtocolDocument> =
  mongoose.models.Protocol || mongoose.model<IProtocolDocument>('Protocol', ProtocolSchema);
