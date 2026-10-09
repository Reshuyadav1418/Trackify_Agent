import { Schema, model, Document } from 'mongoose';

export interface IScreenshotData extends Document {
  screenshotId: Schema.Types.ObjectId;
  data: Buffer;
  contentType: string;
  createdAt: Date;
}

const screenshotDataSchema = new Schema<IScreenshotData>(
  {
    screenshotId: {
      type: Schema.Types.ObjectId,
      ref: 'Screenshot',
      required: true,
      unique: true,
      index: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
    contentType: {
      type: String,
      default: 'image/jpeg',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const ScreenshotDataModel = model<IScreenshotData>('ScreenshotData', screenshotDataSchema);
