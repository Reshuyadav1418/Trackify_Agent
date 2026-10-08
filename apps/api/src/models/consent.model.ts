import { Schema, model, Document } from 'mongoose';

export interface IConsent extends Document {
  userId: Schema.Types.ObjectId;
  policyVersion: number;
  acceptedAt: Date;
  ipAddress?: string;
  createdAt: Date;
}

const consentSchema = new Schema<IConsent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    policyVersion: {
      type: Number,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

consentSchema.index({ userId: 1, policyVersion: 1 }, { unique: true });

export const ConsentModel = model<IConsent>('Consent', consentSchema);
