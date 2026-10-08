import { Schema, model, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  clientName?: string;
  teamIds: Schema.Types.ObjectId[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    clientName: {
      type: String,
      default: '',
    },
    teamIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Team',
      },
    ],
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = model<IProject>('Project', projectSchema);
