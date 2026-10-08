import { Schema, model, Document } from 'mongoose';

export interface IDevice extends Document {
  userId: Schema.Types.ObjectId;
  deviceName: string;
  deviceToken: string;
  os: string;
  ipAddress?: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      required: true,
    },
    deviceToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    os: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const DeviceModel = model<IDevice>('Device', deviceSchema);
