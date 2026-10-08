import { Schema, model, Document } from 'mongoose';

export interface ITeam extends Document {
  name: string;
  managerId?: Schema.Types.ObjectId;
  memberIds: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    memberIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const TeamModel = model<ITeam>('Team', teamSchema);
