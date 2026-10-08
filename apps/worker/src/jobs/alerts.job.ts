/**
 * Job: alerts
 * Two sub-types handled by a single worker:
 *
 *   timer_overdue  – A TimeEntry has no `end` and started > N hours ago.
 *   device_silent  – A Device's lastSeenAt is older than M minutes.
 *
 * "Alerting" here means writing an AuditLog entry (and logging).
 * In production you would also fire an email/Slack webhook here.
 */

import { Job } from 'bullmq';
import mongoose, { Schema, model } from 'mongoose';
import { AlertJobData } from '../queues';
import { logger } from '../logger';
import { config } from '../config';

function getModel(name: string, schemaDef: Record<string, unknown>): mongoose.Model<any> {
  if (mongoose.models[name]) return mongoose.models[name] as mongoose.Model<any>;
  return model<any>(name, new Schema(schemaDef, { strict: false }));
}

function getAuditLogModel() {
  return getModel('AuditLog', {
    actorId:      String,
    action:       String,
    targetEntity: String,
    targetId:     String,
    details:      Schema.Types.Mixed,
    createdAt:    { type: Date, default: Date.now },
  });
}

function getTimeEntryModel() {
  return getModel('TimeEntry', {
    userId: Schema.Types.ObjectId,
    start:  Date,
    end:    Date,
    isStale: Boolean,
  });
}

function getDeviceModel() {
  return getModel('Device', {
    userId:      Schema.Types.ObjectId,
    deviceName:  String,
    lastSeenAt:  Date,
  });
}

// ── Alert: timer overdue ──────────────────────────────────────────────────────
async function handleTimerOverdue(job: Job<AlertJobData>): Promise<void> {
  const { userId, meta } = job.data;
  const timeEntryId = meta.timeEntryId as string | undefined;

  const overdueHours = config.timerOverdueHours;
  const cutoff = new Date(Date.now() - overdueHours * 3_600_000);

  const TimeEntry = getTimeEntryModel();
  const entry = await TimeEntry.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    end:    null,
    start:  { $lte: cutoff },
    isStale: { $ne: true },
  }).lean();

  if (!entry) {
    logger.info('[alerts] timer_overdue: entry already closed or not found', { userId });
    return;
  }

  // Mark entry as stale to suppress repeat alerts
  await TimeEntry.findByIdAndUpdate((entry as any)._id, { isStale: true });

  const AuditLog = getAuditLogModel();
  await AuditLog.create({
    actorId:      'system:worker',
    action:       'ALERT_TIMER_OVERDUE',
    targetEntity: 'TimeEntry',
    targetId:     (entry as any)._id.toString(),
    details: {
      userId,
      startedAt:    (entry as any).start,
      overdueHours,
    },
    createdAt: new Date(),
  });

  logger.warn('[alerts] timer_overdue: alert raised', {
    userId,
    timeEntryId: (entry as any)._id,
    startedAt:   (entry as any).start,
  });
}

// ── Alert: device silent ──────────────────────────────────────────────────────
async function handleDeviceSilent(job: Job<AlertJobData>): Promise<void> {
  const { userId, meta } = job.data;
  const silentMinutes = config.deviceSilentMinutes;
  const cutoff = new Date(Date.now() - silentMinutes * 60_000);

  const Device = getDeviceModel();
  const device = await Device.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    lastSeenAt: { $lte: cutoff },
  }).lean();

  if (!device) {
    logger.info('[alerts] device_silent: device recently active or not found', { userId });
    return;
  }

  const AuditLog = getAuditLogModel();
  await AuditLog.create({
    actorId:      'system:worker',
    action:       'ALERT_DEVICE_SILENT',
    targetEntity: 'Device',
    targetId:     (device as any)._id.toString(),
    details: {
      userId,
      deviceName:   (device as any).deviceName,
      lastSeenAt:   (device as any).lastSeenAt,
      silentMinutes,
    },
    createdAt: new Date(),
  });

  logger.warn('[alerts] device_silent: alert raised', {
    userId,
    deviceName: (device as any).deviceName,
    lastSeenAt: (device as any).lastSeenAt,
  });
}

// ── Job handler ───────────────────────────────────────────────────────────────
export async function alertProcessor(job: Job<AlertJobData>): Promise<void> {
  logger.info('[alerts] Processing', { jobId: job.id, type: job.data.type, userId: job.data.userId });

  switch (job.data.type) {
    case 'timer_overdue':
      await handleTimerOverdue(job);
      break;
    case 'device_silent':
      await handleDeviceSilent(job);
      break;
    default:
      logger.warn('[alerts] Unknown alert type', { type: (job.data as any).type });
  }
}
