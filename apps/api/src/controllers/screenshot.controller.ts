import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ScreenshotModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import { getPresignedUploadUrl, getPresignedDownloadUrl } from '../services/s3.service';
import { logAudit } from '../services/audit.service';
import { thumbnailQueue } from '../queues/client';

export const presignScreenshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    const s3Key = `screenshots/${userId}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.jpg`;
    const uploadUrl = await getPresignedUploadUrl(s3Key, 900); // 15 minutes validity

    res.json({
      message: 'Presigned upload URL generated',
      s3Key,
      key: s3Key,
      uploadUrl,
      expiresInSeconds: 900,
    });
  } catch (error) {
    next(error);
  }
};

export const confirmScreenshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    const { s3Key, capturedAt, timeEntryId, deviceId, isBlurred, activityScore } = req.body;

    const screenshot = await ScreenshotModel.create({
      userId,
      s3Key,
      capturedAt: new Date(capturedAt),
      timeEntryId: timeEntryId || null,
      deviceId: deviceId || null,
      isBlurred: Boolean(isBlurred),
      activityScore: Number(activityScore) || 0,
    });

    // Enqueue thumbnail generation (non-fatal if Redis is unavailable)
    try {
      await thumbnailQueue.add('generate-thumb', {
        screenshotId: screenshot._id.toString(),
        s3Key,
        userId,
      });
    } catch (qErr) {
      console.warn('[API] Could not enqueue thumbnail job:', (qErr as Error).message);
    }

    res.status(201).json({
      message: 'Screenshot metadata saved',
      screenshot,
    });
  } catch (error) {
    next(error);
  }
};

export const getScreenshotById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { id } = req.params;

    const filter: Record<string, unknown> = { _id: id, ...(req.rbacFilter || {}) };
    const screenshot = await ScreenshotModel.findOne(filter).populate('userId', 'name email role');
    if (!screenshot) {
      throw new AppError('Screenshot not found or access denied', 404);
    }

    const downloadUrl = await getPresignedDownloadUrl(screenshot.s3Key, 900); // 15 minutes validity

    // SPEC Rule: Every screenshot view is written to an audit log
    await logAudit({
      actorId: req.user.userId,
      action: 'VIEW_SCREENSHOT',
      targetEntity: 'Screenshot',
      targetId: screenshot._id.toString(),
      details: {
        s3Key: screenshot.s3Key,
        capturedAt: screenshot.capturedAt,
        screenshotOwnerId: screenshot.userId,
      },
      ipAddress: req.ip,
    });

    res.json({
      screenshot,
      downloadUrl,
      expiresInSeconds: 900,
    });
  } catch (error) {
    next(error);
  }
};

export const getScreenshots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const filter: Record<string, unknown> = { ...(req.rbacFilter || {}) };

    if (req.query.userId && req.query.userId !== 'all') {
      filter.userId = req.query.userId;
    }

    if (req.query.startDate && req.query.endDate) {
      filter.capturedAt = {
        $gte: new Date(req.query.startDate as string),
        $lte: new Date(req.query.endDate as string),
      };
    } else if (req.query.startDate) {
      filter.capturedAt = { $gte: new Date(req.query.startDate as string) };
    }

    const screenshots = await ScreenshotModel.find(filter)
      .populate('userId', 'name email role')
      .populate({
        path: 'timeEntryId',
        populate: [
          { path: 'projectId', select: 'name' },
          { path: 'taskId', select: 'name' },
        ],
      })
      .populate('deviceId', 'deviceName os ipAddress')
      .sort({ capturedAt: -1 })
      .limit(300);

    const screenshotsWithUrls = await Promise.all(
      screenshots.map(async (sc) => {
        let downloadUrl = '';
        try {
          downloadUrl = await getPresignedDownloadUrl(sc.s3Key, 900);
        } catch {
          // If minio error or missing object
        }
        return {
          ...sc.toObject(),
          downloadUrl,
        };
      })
    );

    res.json({ screenshots: screenshotsWithUrls });
  } catch (error) {
    next(error);
  }
};

export const deleteScreenshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { id } = req.params;
    const filter: Record<string, unknown> = { _id: id, ...(req.rbacFilter || {}) };

    const screenshot = await ScreenshotModel.findOneAndDelete(filter);
    if (!screenshot) {
      throw new AppError('Screenshot not found or access denied', 404);
    }

    await logAudit({
      actorId: req.user.userId,
      action: 'DELETE_SCREENSHOT',
      targetEntity: 'Screenshot',
      targetId: id,
      details: { s3Key: screenshot.s3Key },
      ipAddress: req.ip,
    });

    res.json({ message: 'Screenshot deleted successfully' });
  } catch (error) {
    next(error);
  }
};

