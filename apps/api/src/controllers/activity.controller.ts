import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ActivitySampleModel } from '../models';
import { AppError } from '../middleware/error.middleware';

export const batchActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    const { deviceId, samples } = req.body;
    if (!Array.isArray(samples) || samples.length === 0) {
      throw new AppError('Activity samples array is required', 400);
    }

    const bulkOperations: any[] = samples.map((sample) => {
      const timestampDate = new Date(sample.timestamp);
      const minuteBucket = new Date(timestampDate);
      minuteBucket.setSeconds(0, 0);

      const sampleDoc = {
        userId: new Types.ObjectId(userId),
        deviceId: deviceId ? new Types.ObjectId(deviceId) : null,
        timestamp: timestampDate,
        minuteBucket,
        keyboardCount: Math.max(0, sample.keyboardCount || 0),
        mouseCount: Math.max(0, sample.mouseCount || 0),
        isIdle: Boolean(sample.isIdle),
        activeWindowTitle: sample.activeWindowTitle || '',
      };

      return {
        updateOne: {
          filter: { userId: new Types.ObjectId(userId), minuteBucket },
          update: { $set: sampleDoc },
          upsert: true,
        },
      };
    });

    const result = await ActivitySampleModel.bulkWrite(bulkOperations);
    const ingestedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    const duplicateCount = samples.length - ingestedCount;

    res.status(200).json({
      message: 'Activity samples processed',
      totalSubmitted: samples.length,
      upsertedCount: result.upsertedCount,
      modifiedCount: result.modifiedCount,
      deduplicatedCount: duplicateCount,
    });
  } catch (error) {
    next(error);
  }
};
