import { Request, Response, NextFunction } from 'express';
import { TimeEntryModel } from '../models';
import { AppError } from '../middleware/error.middleware';
import { logAudit } from '../services/audit.service';
import { Types } from 'mongoose';

export const createManualEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    const { taskId, projectId, start, end, reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new AppError('A reason is required for manual time entries', 400);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate.getTime() <= startDate.getTime()) {
      throw new AppError('End time must be after start time', 400);
    }

    const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

    const auditItem = {
      action: 'CREATE_MANUAL_ENTRY',
      editedBy: new Types.ObjectId(userId) as any,
      editedAt: new Date(),
      reason: reason.trim(),
      previousData: {},
    };

    const entry = await TimeEntryModel.create({
      userId,
      taskId: taskId || null,
      projectId: projectId || null,
      start: startDate,
      end: endDate,
      durationSeconds,
      isManualEdit: true,
      reason: reason.trim(),
      auditLogs: [auditItem],
    });

    await logAudit({
      actorId: userId,
      action: 'MANUAL_TIME_EDIT',
      targetEntity: 'TimeEntry',
      targetId: entry._id.toString(),
      details: {
        operation: 'CREATE',
        reason: reason.trim(),
        start: startDate,
        end: endDate,
        durationSeconds,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Manual time entry created',
      timeEntry: entry,
    });
  } catch (error) {
    next(error);
  }
};

export const updateManualEntry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { id } = req.params;
    const { start, end, taskId, projectId, reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new AppError('A reason is required when modifying a time entry', 400);
    }

    const filter: Record<string, unknown> = { _id: id, ...(req.rbacFilter || {}) };
    const entry = await TimeEntryModel.findOne(filter);
    if (!entry) {
      throw new AppError('Time entry not found or access denied', 404);
    }

    const previousData = {
      start: entry.start,
      end: entry.end,
      taskId: entry.taskId,
      projectId: entry.projectId,
      durationSeconds: entry.durationSeconds,
    };

    if (start) entry.start = new Date(start);
    if (end) entry.end = new Date(end);
    if (taskId !== undefined) entry.taskId = taskId ? (taskId as any) : null;
    if (projectId !== undefined) entry.projectId = projectId ? (projectId as any) : null;

    if (entry.end && entry.start && new Date(entry.end).getTime() > new Date(entry.start).getTime()) {
      entry.durationSeconds = Math.round((new Date(entry.end).getTime() - new Date(entry.start).getTime()) / 1000);
    }

    entry.isManualEdit = true;
    entry.reason = reason.trim();

    const auditItem = {
      action: 'UPDATE_MANUAL_ENTRY',
      editedBy: new Types.ObjectId(req.user.userId) as any,
      editedAt: new Date(),
      reason: reason.trim(),
      previousData,
    };

    entry.auditLogs.push(auditItem);
    await entry.save();

    await logAudit({
      actorId: req.user.userId,
      action: 'MANUAL_TIME_EDIT',
      targetEntity: 'TimeEntry',
      targetId: entry._id.toString(),
      details: {
        operation: 'UPDATE',
        reason: reason.trim(),
        previousData,
        newData: {
          start: entry.start,
          end: entry.end,
          durationSeconds: entry.durationSeconds,
        },
      },
      ipAddress: req.ip,
    });

    res.json({
      message: 'Time entry updated',
      timeEntry: entry,
    });
  } catch (error) {
    next(error);
  }
};
