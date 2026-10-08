import { Schema, model, Document } from 'mongoose';

export interface IScreenshot extends Document {
  userId: Schema.Types.ObjectId;
  deviceId?: Schema.Types.ObjectId;
  timeEntryId?: Schema.Types.ObjectId;
  s3Key: string;
  capturedAt: Date;
  isBlurred: boolean;
  activityScore: number;
  createdAt: Date;
}

const screenshotSchema = new Schema<IScreenshot>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Device',
    },
    timeEntryId: {
      type: Schema.Types.ObjectId,
      ref: 'TimeEntry',
    },
    s3Key: {
      type: String,
      required: true,
    },
    capturedAt: {
      type: Date,
      required: true,
    },
    isBlurred: {
      type: Boolean,
      default: false,
    },
    activityScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index required by spec: { userId, capturedAt }
screenshotSchema.index({ userId: 1, capturedAt: 1 });

export const ScreenshotModel = model<IScreenshot>('Screenshot', screenshotSchema);
