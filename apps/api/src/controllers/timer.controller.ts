import { Request, Response, NextFunction } from 'express';
import { TimeEntryModel, PolicyModel, ConsentModel } from '../models';
import { AppError } from '../middleware/error.middleware';

export const startTimer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;

    // 1. Check active policy consent requirement
    const activePolicy = await PolicyModel.findOne({ isActive: true }).sort({ version: -1 });
    if (activePolicy) {
      const consent = await ConsentModel.findOne({ userId, policyVersion: activePolicy.version });
      if (!consent) {
        throw new AppError(
          `Must accept current tracking policy (v${activePolicy.version}) before starting timer`,
          403
        );
      }
    }

    // 2. Check for existing active timer (only one active timer per user allowed)
    const existingActiveTimer = await TimeEntryModel.findOne({ userId, end: null });
    if (existingActiveTimer) {
      throw new AppError('An active timer is already running for this user', 400);
    }

    const { taskId, projectId, description } = req.body;

    const newTimer = await TimeEntryModel.create({
      userId,
      taskId: taskId || null,
      projectId: projectId || null,
      description: description || '',
      start: new Date(),
      end: null,
      durationSeconds: 0,
      isManualEdit: false,
    });

    res.status(201).json({
      message: 'Timer started',
      timeEntry: newTimer,
    });
  } catch (error) {
    next(error);
  }
};

export const stopTimer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const userId = req.user.userId;
    const { timeEntryId, durationSeconds: clientDurationSeconds, breakSeconds: clientBreakSeconds } = req.body;

    let timeEntry;
    if (timeEntryId) {
      timeEntry = await TimeEntryModel.findOne({ _id: timeEntryId, userId, end: null });
    } else {
      timeEntry = await TimeEntryModel.findOne({ userId, end: null }).sort({ start: -1 });
    }

    if (!timeEntry) {
      res.json({ message: 'No active timer found to stop (state synchronized)', timeEntry: null });
      return;
    }

    const stopTime = new Date();
    const rawElapsed = Math.max(0, Math.round((stopTime.getTime() - new Date(timeEntry.start).getTime()) / 1000));

    // Use client duration if accurately calculated by agent (excluding breaks and auto-idle), otherwise fallback
    const finalDuration = (typeof clientDurationSeconds === 'number' && clientDurationSeconds >= 0)
      ? clientDurationSeconds
      : rawElapsed;

    const breakSeconds = (typeof clientBreakSeconds === 'number' && clientBreakSeconds >= 0)
      ? clientBreakSeconds
      : 0;

    // Stale-timer guard: flag timers running more than 12 hours (43200 seconds)
    const isStale = rawElapsed > 43200;

    timeEntry.end = stopTime;
    timeEntry.durationSeconds = finalDuration;
    timeEntry.breakSeconds = breakSeconds;
    timeEntry.isStale = isStale;

    await timeEntry.save();

    res.json({
      message: 'Timer stopped',
      timeEntry,
      isStaleFlagged: isStale,
    });
  } catch (error) {
    next(error);
  }
};

export const getStaleTimers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { isStale: true, ...(req.rbacFilter || {}) };
    const staleEntries = await TimeEntryModel.find(filter).populate('userId', 'name email role');
    res.json({ staleEntries });
  } catch (error) {
    next(error);
  }
};
