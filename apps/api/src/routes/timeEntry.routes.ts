import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { scopeUserAccess } from '../middleware/rbac.middleware';
import { TimeEntryModel } from '../models';
import { logAudit } from '../services/audit.service';
import { AppError } from '../middleware/error.middleware';

const router = Router();

// GET /api/time-entries -> scoped by RBAC filter and optional date/user queries
router.get(
  '/',
  authenticateToken,
  scopeUserAccess(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filter: Record<string, unknown> = { ...(req.rbacFilter || {}) };

      if (req.query.userId && req.query.userId !== 'all') {
        filter.userId = req.query.userId;
      }

      if (req.query.startDate && req.query.endDate) {
        filter.start = {
          $gte: new Date(req.query.startDate as string),
          $lte: new Date(req.query.endDate as string),
        };
      } else if (req.query.startDate) {
        filter.start = { $gte: new Date(req.query.startDate as string) };
      }

      const timeEntries = await TimeEntryModel.find(filter)
        .populate('userId', 'name email role')
        .populate('projectId', 'name')
        .populate('taskId', 'name')
        .sort({ start: -1 });

      res.json({ filterApplied: filter, count: timeEntries.length, timeEntries });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/time-entries/:id -> delete a work session
router.delete(
  '/:id',
  authenticateToken,
  scopeUserAccess(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filter: Record<string, unknown> = { _id: id, ...(req.rbacFilter || {}) };

      const entry = await TimeEntryModel.findOneAndDelete(filter);
      if (!entry) {
        throw new AppError('Time entry not found or access denied', 404);
      }

      if (req.user) {
        await logAudit({
          actorId: req.user.userId,
          action: 'DELETE_TIME_ENTRY',
          targetEntity: 'TimeEntry',
          targetId: id,
          details: { deletedStart: entry.start, durationSeconds: entry.durationSeconds },
          ipAddress: req.ip,
        });
      }

      res.json({ message: 'Session deleted successfully', id });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/time-entries/:id/notes -> edit session notes
router.patch(
  '/:id/notes',
  authenticateToken,
  scopeUserAccess(),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { description } = req.body;
      const filter: Record<string, unknown> = { _id: id, ...(req.rbacFilter || {}) };

      const entry = await TimeEntryModel.findOneAndUpdate(
        filter,
        { $set: { description } },
        { new: true }
      );

      if (!entry) {
        throw new AppError('Time entry not found or access denied', 404);
      }

      res.json({ message: 'Session notes updated', timeEntry: entry });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/time-entries/sync -> sync offline time entries batch
router.post(
  '/sync',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new AppError('Unauthorized', 401);
      const userId = req.user.userId;
      const { entries } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        res.json({ message: 'No entries to sync', syncedCount: 0, syncedIds: [] });
        return;
      }

      const syncedIds: string[] = [];
      for (const item of entries) {
        if (!item.start) continue;

        const start = new Date(item.start);
        const durationSeconds = Number(item.durationSeconds) || 0;
        const breakSeconds = Number(item.breakSeconds) || 0;
        const end = item.end ? new Date(item.end) : new Date(start.getTime() + durationSeconds * 1000);

        // Check if entry already exists (within 3s variance for same user)
        const existing = await TimeEntryModel.findOne({
          userId,
          start: { $gte: new Date(start.getTime() - 3000), $lte: new Date(start.getTime() + 3000) },
        });

        if (existing) {
          existing.durationSeconds = durationSeconds;
          existing.breakSeconds = breakSeconds;
          existing.end = end;
          if (item.projectId) existing.projectId = item.projectId;
          if (item.taskId) existing.taskId = item.taskId;
          if (item.description) existing.description = item.description;
          await existing.save();
          syncedIds.push(item.id || existing._id.toString());
        } else {
          const created = await TimeEntryModel.create({
            userId,
            projectId: item.projectId || null,
            taskId: item.taskId || null,
            description: item.description || '',
            start,
            end,
            durationSeconds,
            breakSeconds,
            isManualEdit: Boolean(item.isManualEdit),
          });
          syncedIds.push(item.id || created._id.toString());
        }
      }

      res.status(200).json({
        message: 'Time entries synced successfully',
        syncedCount: syncedIds.length,
        syncedIds,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
