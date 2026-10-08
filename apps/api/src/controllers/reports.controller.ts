import { Request, Response, NextFunction } from 'express';
import { TimeEntryModel, ActivitySampleModel, ProjectModel } from '../models';
import { AppError } from '../middleware/error.middleware';

const jsonToCsv = (items: Record<string, unknown>[]): string => {
  if (!items || items.length === 0) return '';
  const headers = Object.keys(items[0]);
  const rows = items.map((item) =>
    headers.map((h) => {
      const val = item[h];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

export const getTimesheetReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, format } = req.query;

    const query: Record<string, unknown> = { ...(req.rbacFilter || {}) };

    if (startDate || endDate) {
      query.start = {};
      if (startDate) (query.start as any).$gte = new Date(startDate as string);
      if (endDate) (query.start as any).$lte = new Date(endDate as string);
    }

    const entries = await TimeEntryModel.find(query)
      .populate('userId', 'name email role')
      .populate('projectId', 'name')
      .populate('taskId', 'title')
      .sort({ start: -1 });

    const formatted = entries.map((entry) => ({
      id: entry._id.toString(),
      user: (entry.userId as any)?.name || 'Unknown',
      userEmail: (entry.userId as any)?.email || '',
      project: (entry.projectId as any)?.name || 'N/A',
      task: (entry.taskId as any)?.title || 'N/A',
      start: entry.start.toISOString(),
      end: entry.end ? entry.end.toISOString() : 'Running',
      durationMinutes: (entry.durationSeconds / 60).toFixed(2),
      isManualEdit: entry.isManualEdit,
      reason: entry.reason || '',
      isStale: entry.isStale || false,
    }));

    if (format === 'csv') {
      const csvData = jsonToCsv(formatted);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="timesheet-report.csv"');
      res.send(csvData);
      return;
    }

    res.json({
      count: formatted.length,
      reports: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getActivityReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, format } = req.query;

    const query: Record<string, unknown> = { ...(req.rbacFilter || {}) };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) (query.timestamp as any).$gte = new Date(startDate as string);
      if (endDate) (query.timestamp as any).$lte = new Date(endDate as string);
    }

    const samples = await ActivitySampleModel.find(query)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 });

    const formatted = samples.map((s) => ({
      id: s._id.toString(),
      user: (s.userId as any)?.name || 'Unknown',
      userEmail: (s.userId as any)?.email || '',
      timestamp: s.timestamp.toISOString(),
      minuteBucket: s.minuteBucket.toISOString(),
      keyboardCount: s.keyboardCount,
      mouseCount: s.mouseCount,
      isIdle: s.isIdle,
      windowTitle: s.activeWindowTitle || '',
    }));

    if (format === 'csv') {
      const csvData = jsonToCsv(formatted);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="activity-report.csv"');
      res.send(csvData);
      return;
    }

    res.json({
      count: formatted.length,
      reports: formatted,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectsReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, format } = req.query;

    const query: Record<string, unknown> = { ...(req.rbacFilter || {}) };

    if (startDate || endDate) {
      query.start = {};
      if (startDate) (query.start as any).$gte = new Date(startDate as string);
      if (endDate) (query.start as any).$lte = new Date(endDate as string);
    }

    const timeEntries = await TimeEntryModel.find(query).populate('projectId', 'name clientName');

    const projectMap: Record<string, { projectName: string; clientName: string; totalSeconds: number; entryCount: number }> = {};

    for (const entry of timeEntries) {
      const proj = entry.projectId as any;
      const projId = proj?._id?.toString() || 'unassigned';
      const projName = proj?.name || 'Unassigned Project';
      const clientName = proj?.clientName || 'N/A';

      if (!projectMap[projId]) {
        projectMap[projId] = { projectName: projName, clientName, totalSeconds: 0, entryCount: 0 };
      }

      projectMap[projId].totalSeconds += entry.durationSeconds || 0;
      projectMap[projId].entryCount += 1;
    }

    const formatted = Object.values(projectMap).map((p) => ({
      projectName: p.projectName,
      clientName: p.clientName,
      totalHours: (p.totalSeconds / 3600).toFixed(2),
      totalSeconds: p.totalSeconds,
      entryCount: p.entryCount,
    }));

    if (format === 'csv') {
      const csvData = jsonToCsv(formatted);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="projects-report.csv"');
      res.send(csvData);
      return;
    }

    res.json({
      count: formatted.length,
      reports: formatted,
    });
  } catch (error) {
    next(error);
  }
};

// ── Async heavy report via BullMQ ─────────────────────────────────────────────
import { reportQueue } from '../queues/client';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const generateReportAsync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { reportType, params } = req.body;
    if (!['timesheet', 'activity', 'projects'].includes(reportType)) {
      throw new AppError('Invalid reportType. Must be timesheet | activity | projects', 400);
    }

    const job = await reportQueue.add('generate', {
      reportType,
      requestedBy: req.user.userId,
      params: params || {},
    });

    res.status(202).json({
      message: 'Report generation queued',
      jobId:  job.id,
      statusUrl: `/api/reports/status/${job.id}`,
    });
  } catch (error) {
    next(error);
  }
};

export const getReportJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { jobId } = req.params;

    // Peek job state via a temporary Queue reference (read-only)
    const q = reportQueue as Queue;
    const job = await q.getJob(jobId);
    if (!job) throw new AppError('Job not found', 404);

    const state     = await job.getState();
    const progress  = job.progress;
    const result    = job.returnvalue as { outputKey?: string } | null;
    const failedReason = job.failedReason;

    res.json({ jobId, state, progress, outputKey: result?.outputKey ?? null, failedReason: failedReason ?? null });
  } catch (error) {
    next(error);
  }
};

