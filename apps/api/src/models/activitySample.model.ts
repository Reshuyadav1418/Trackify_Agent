import { Schema, model, Document } from 'mongoose';

export interface IActivitySample extends Document {
  userId: Schema.Types.ObjectId;
  deviceId?: Schema.Types.ObjectId;
  timeEntryId?: Schema.Types.ObjectId;
  timestamp: Date;
  minuteBucket: Date;
  keyboardCount: number; // Only count, NO contents per spec
  mouseCount: number;
  isIdle: boolean;
  activeWindowTitle?: string;
  createdAt: Date;
}

const activitySampleSchema = new Schema<IActivitySample>(
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
    timestamp: {
      type: Date,
      required: true,
    },
    minuteBucket: {
      type: Date,
      required: true,
    },
    keyboardCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    mouseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isIdle: {
      type: Boolean,
      default: false,
    },
    activeWindowTitle: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique index for deduplication per user and minuteBucket
activitySampleSchema.index({ userId: 1, minuteBucket: 1 }, { unique: true });

export const ActivitySampleModel = model<IActivitySample>('ActivitySample', activitySampleSchema);
