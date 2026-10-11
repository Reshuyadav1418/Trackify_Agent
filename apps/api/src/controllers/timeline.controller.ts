import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { TimeEntryModel, ActivitySampleModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import { buildTimelineSegments } from '@teamlogger/shared';

export const getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);

    const { role, userId } = req.user;
    let targetUserId = userId;

    // RBAC: Check requested userId
    if (req.query.userId && typeof req.query.userId === 'string' && req.query.userId !== 'all') {
      const requestedId = req.query.userId;
      if (role === 'admin') {
        targetUserId = requestedId;
      } else if (role === 'manager') {
        // Must be in manager's allowed rbacFilter
        const allowedIds = (req.rbacFilter?.userId as any)?.$in || [userId];
        if (allowedIds.includes(requestedId)) {
          targetUserId = requestedId;
        } else {
          throw new AppError('Forbidden: you do not manage this employee', 403);
        }
      } else {
        // Employee can only access own timeline
        if (requestedId !== userId) {
          throw new AppError('Forbidden: employees can only view their own timeline', 403);
        }
      }
    }

    const dayReset = (req.query.dayReset as string) || '04:00';
    const dateStr = (req.query.dateStr as string) || (req.query.from ? String(req.query.from).slice(0, 10) : new Date().toISOString().slice(0, 10));

    // Calculate 24-hour cycle window
    const [startH, startM] = dayReset.split(':').map((v) => parseInt(v, 10));
    const cycleStart = new Date(`${dateStr}T00:00:00`);
    cycleStart.setHours(isNaN(startH) ? 4 : startH, isNaN(startM) ? 0 : startM, 0, 0);

    const fromDate = req.query.from ? new Date(req.query.from as string) : cycleStart;
    const toDate = req.query.to ? new Date(req.query.to as string) : new Date(cycleStart.getTime() + 24 * 60 * 60 * 1000);

    // Query time entries overlapping this cycle
    const userObjectId = new Types.ObjectId(targetUserId);

    const timeEntries = await TimeEntryModel.find({
      userId: userObjectId,
      start: { $lt: toDate },
      $or: [
        { end: null },
        { end: { $gt: fromDate } },
      ],
    }).sort({ start: 1 });

    // Query activity samples in this cycle
    const activitySamples = await ActivitySampleModel.find({
      userId: userObjectId,
      timestamp: { $gte: fromDate, $lte: toDate },
    }).sort({ timestamp: 1 });

    // Build single source of truth merged segments
    const segments = buildTimelineSegments({
      timeEntries: timeEntries.map((e) => ({
        id: e._id.toString(),
        start: e.start,
        end: e.end,
        isManualEdit: e.isManualEdit,
        durationSeconds: e.durationSeconds,
        breakSeconds: e.breakSeconds,
        idleSeconds: e.idleSeconds,
      })),
      activitySamples: activitySamples.map((s) => ({
        minuteBucket: s.minuteBucket,
        timestamp: s.timestamp,
        isIdle: s.isIdle,
      })),
      currentTime: new Date(),
      dayReset,
      dateStr,
    });

    res.json({
      userId: targetUserId,
      dateStr,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      segments,
      timeEntries,
      activitySamplesCount: activitySamples.length,
    });
  } catch (error) {
    next(error);
  }
};
