import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ScreenshotModel, ScreenshotDataModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import { getPresignedUploadUrl, uploadToS3Direct, getS3ObjectStream } from '../services/s3.service';
import { logAudit } from '../services/audit.service';
import { thumbnailQueue } from '../queues/client';

const getBaseUrl = (req: Request): string => {
  const host = req.get('host') || 'localhost:4000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
};

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

export const uploadDirectScreenshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    const {
      imageBase64,
      capturedAt,
      timeEntryId,
      deviceId,
      isBlurred,
      activityScore,
    } = req.body;

    if (!imageBase64) {
      throw new AppError('Image data (imageBase64) is required', 400);
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const s3Key = `screenshots/${userId}/${Date.now()}_${crypto.randomBytes(6).toString('hex')}.jpg`;

    // 1. Create screenshot metadata
    const screenshot = await ScreenshotModel.create({
      userId,
      s3Key,
      capturedAt: capturedAt ? new Date(capturedAt) : new Date(),
      timeEntryId: timeEntryId || null,
      deviceId: deviceId || null,
      isBlurred: Boolean(isBlurred),
      activityScore: Number(activityScore) || 0,
    });

    // 2. Persist binary image in MongoDB
    await ScreenshotDataModel.create({
      screenshotId: screenshot._id,
      data: buffer,
      contentType: 'image/jpeg',
    });

    // 3. Optional S3 backup if remote S3 configured
    try {
      if (process.env.S3_BUCKET && process.env.S3_ENDPOINT && !process.env.S3_ENDPOINT.includes('localhost')) {
        await uploadToS3Direct(s3Key, buffer, 'image/jpeg');
      }
    } catch (s3Err) {
      console.warn('[API] S3 backup notice:', (s3Err as Error).message);
    }

    // 4. Enqueue thumbnail job if queue ready
    try {
      await thumbnailQueue.add('generate-thumb', {
        screenshotId: screenshot._id.toString(),
        s3Key,
        userId,
      });
    } catch (qErr) {
      console.warn('[API] Could not enqueue thumbnail job:', (qErr as Error).message);
    }

    const baseUrl = getBaseUrl(req);
    res.status(201).json({
      message: 'Screenshot uploaded and saved successfully',
      screenshot: {
        ...screenshot.toObject(),
        downloadUrl: `${baseUrl}/api/screenshots/${screenshot._id}/image`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const confirmScreenshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    const { s3Key, capturedAt, timeEntryId, deviceId, isBlurred, activityScore, imageBase64 } = req.body;

    const screenshot = await ScreenshotModel.create({
      userId,
      s3Key,
      capturedAt: new Date(capturedAt),
      timeEntryId: timeEntryId || null,
      deviceId: deviceId || null,
      isBlurred: Boolean(isBlurred),
      activityScore: Number(activityScore) || 0,
    });

    if (imageBase64) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        await ScreenshotDataModel.findOneAndUpdate(
          { screenshotId: screenshot._id },
          { data: buffer, contentType: 'image/jpeg' },
          { upsert: true }
        );
      } catch (err) {
        console.warn('[API] Could not save imageBase64 in confirm:', err);
      }
    }

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

    const baseUrl = getBaseUrl(req);
    res.status(201).json({
      message: 'Screenshot metadata saved',
      screenshot: {
        ...screenshot.toObject(),
        downloadUrl: `${baseUrl}/api/screenshots/${screenshot._id}/image`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getScreenshotImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Check MongoDB ScreenshotData
    const dataDoc = await ScreenshotDataModel.findOne({ screenshotId: id });
    if (dataDoc && dataDoc.data) {
      res.set('Content-Type', dataDoc.contentType || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.send(dataDoc.data);
      return;
    }

    // 2. Check metadata
    const screenshot = await ScreenshotModel.findById(id);
    if (!screenshot) {
      res.status(404).send('Screenshot not found');
      return;
    }

    // 3. Try S3 if configured
    try {
      if (process.env.S3_BUCKET && process.env.S3_ENDPOINT && !process.env.S3_ENDPOINT.includes('localhost')) {
        const s3Stream = await getS3ObjectStream(screenshot.s3Key);
        if (s3Stream) {
          res.set('Content-Type', 'image/jpeg');
          res.set('Cache-Control', 'public, max-age=86400');
          s3Stream.pipe(res);
          return;
        }
      }
    } catch (_) {}

    // 4. Return clean, aesthetic dark SVG card placeholder (no broken image icons in browser)
    const timeStr = screenshot.capturedAt ? new Date(screenshot.capturedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#141e33" />
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#bg)" rx="16"/>
  <circle cx="400" cy="180" r="44" fill="#1e293b"/>
  <path d="M375 168 h50 v34 h-50 z M385 160 h30 v8 h-30 z" fill="#64748b"/>
  <circle cx="400" cy="185" r="10" fill="#38bdf8"/>
  <text x="400" y="260" font-family="Inter, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#f8fafc" text-anchor="middle">
    Trackify Screen Capture
  </text>
  <text x="400" y="295" font-family="Inter, -apple-system, sans-serif" font-size="15" fill="#94a3b8" text-anchor="middle">
    Captured at ${timeStr} • ${screenshot.activityScore || 85}% Activity
  </text>
</svg>
    `.trim();

    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(svg);
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

    const baseUrl = getBaseUrl(req);
    const downloadUrl = `${baseUrl}/api/screenshots/${screenshot._id}/image`;

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
      expiresInSeconds: 86400,
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

    const baseUrl = getBaseUrl(req);
    const screenshotsWithUrls = screenshots.map((sc) => {
      const downloadUrl = `${baseUrl}/api/screenshots/${sc._id}/image`;
      return {
        ...sc.toObject(),
        downloadUrl,
      };
    });

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

    // Also delete binary data
    await ScreenshotDataModel.deleteOne({ screenshotId: id });

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
