import { Schema, model, Document } from 'mongoose';
import { UserRole } from '@teamlogger/shared';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teamId?: Schema.Types.ObjectId;
  refreshTokenHashes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    refreshTokenHashes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<IUser>('User', userSchema);
