import mongoose, { Schema, Document, Model } from 'mongoose';
import { AuditEventData } from '@/types';

export interface IAuditEventDocument extends Omit<AuditEventData, 'timestamp'>, Document {
  timestamp: Date;
}

const AuditEventSchema = new Schema<IAuditEventDocument>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    action: { type: String, required: true, index: true },
    actor: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    trialId: { type: String, index: true },
    patientId: { type: String, index: true },
    details: { type: Schema.Types.Mixed, default: {} },
    hindsightBankId: { type: String },
  },
  {
    timestamps: false, // Immutable append-only audit trail
  }
);

AuditEventSchema.index({ trialId: 1, timestamp: -1 });

export const AuditEventModel: Model<IAuditEventDocument> =
  mongoose.models.AuditEvent ||
  mongoose.model<IAuditEventDocument>('AuditEvent', AuditEventSchema);
