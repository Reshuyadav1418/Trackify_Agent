import { Schema, model, Document, Types } from 'mongoose';

export interface ITimeEntryAuditLog {
  action: string;
  editedBy: Types.ObjectId;
  editedAt: Date;
  reason: string;
  previousData?: Record<string, unknown>;
}

export interface ITimeEntry extends Document {
  userId: Schema.Types.ObjectId;
  projectId?: Schema.Types.ObjectId;
  taskId?: Schema.Types.ObjectId;
  description?: string;
  start: Date;
  end?: Date | null;
  durationSeconds: number;
  breakSeconds: number;
  isManualEdit: boolean;
  reason?: string;
  isStale?: boolean;
  auditLogs: ITimeEntryAuditLog[];
  createdAt: Date;
  updatedAt: Date;
}

const timeEntryAuditLogSchema = new Schema<ITimeEntryAuditLog>(
  {
    action: { type: String, required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editedAt: { type: Date, default: Date.now },
    reason: { type: String, required: true },
    previousData: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
    },
    description: {
      type: String,
      default: '',
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    breakSeconds: {
      type: Number,
      default: 0,
    },
    isManualEdit: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      default: '',
    },
    isStale: {
      type: Boolean,
      default: false,
    },
    auditLogs: {
      type: [timeEntryAuditLogSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index required by spec: { userId, start }
timeEntrySchema.index({ userId: 1, start: 1 });

export const TimeEntryModel = model<ITimeEntry>('TimeEntry', timeEntrySchema);
