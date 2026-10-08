import { Schema, model, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  projectId: Schema.Types.ObjectId;
  assignedUserIds: Schema.Types.ObjectId[];
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    assignedUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
    },
  },
  {
    timestamps: true,
  }
);

export const TaskModel = model<ITask>('Task', taskSchema);
