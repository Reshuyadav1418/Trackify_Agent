import { Schema, model, Document } from 'mongoose';

export interface IPolicy extends Document {
  version: number;
  screenshotIntervalMinutes: number;
  isBlurEnabled: boolean;
  retentionDays: number;
  consentText: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const policySchema = new Schema<IPolicy>(
  {
    version: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    screenshotIntervalMinutes: {
      type: Number,
      required: true,
      default: 10,
    },
    isBlurEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    retentionDays: {
      type: Number,
      required: true,
      default: 30,
    },
    consentText: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PolicyModel = model<IPolicy>('Policy', policySchema);
