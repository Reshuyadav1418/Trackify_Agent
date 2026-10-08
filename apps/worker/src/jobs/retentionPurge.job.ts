/**
 * Job: retention-purge
 * Nightly job that enforces the policy retentionDays setting:
 *   1. Deletes S3 screenshot objects older than retentionDays.
 *   2. Deletes Screenshot DB records.
 *   3. Deletes ActivitySample records older than retentionDays.
 *   4. Writes a single auditLog entry summarising the purge.
 *
 * Supports dryRun mode (logs what would be deleted, no actual deletes).
 */

import { Job } from 'bullmq';
import mongoose, { Schema, model } from 'mongoose';
import {
  S3Client,
  DeleteObjectsCommand,
  ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { config } from '../config';
import { logger } from '../logger';
import { RetentionPurgeJobData } from '../queues';

// ── S3 client ─────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  endpoint:       config.s3Endpoint,
  region:         config.s3Region,
  credentials:    { accessKeyId: config.s3AccessKey, secretAccessKey: config.s3SecretKey },
  forcePathStyle: true,
});

// ── Lazy model getters ────────────────────────────────────────────────────────
function getModel(name: string, schemaDef: Record<string, unknown>): mongoose.Model<any> {
  if (mongoose.models[name]) return mongoose.models[name] as mongoose.Model<any>;
  return model<any>(name, new Schema(schemaDef, { strict: false }));
}

function getPolicyModel() {
  return getModel('Policy', {
    retentionDays: { type: Number, default: 30 },
    isActive:      { type: Boolean, default: false },
  });
}

function getScreenshotModel() {
  return getModel('Screenshot', { s3Key: String, capturedAt: Date, userId: Schema.Types.ObjectId });
}

function getActivitySampleModel() {
  return getModel('ActivitySample', { minuteBucket: Date, userId: Schema.Types.ObjectId });
}

function getAuditLogModel() {
  return getModel('AuditLog', {
    actorId:      String,
    action:       String,
    targetEntity: String,
    details:      Schema.Types.Mixed,
    createdAt:    { type: Date, default: Date.now },
  });
}

// ── Batch S3 delete helper ────────────────────────────────────────────────────
async function deleteS3Objects(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  let deleted = 0;
  // S3 DeleteObjects supports max 1000 per call
  for (let i = 0; i < keys.length; i += 1000) {
    const batch: ObjectIdentifier[] = keys.slice(i, i + 1000).map((Key) => ({ Key }));
    const res = await s3.send(new DeleteObjectsCommand({
      Bucket: config.s3Bucket,
      Delete: { Objects: batch, Quiet: true },
    }));
    deleted += batch.length - (res.Errors?.length ?? 0);
    if (res.Errors?.length) {
      logger.warn('[retention] S3 delete errors', { errors: res.Errors });
    }
  }
  return deleted;
}

// ── Job handler ───────────────────────────────────────────────────────────────
export async function retentionPurgeProcessor(job: Job<RetentionPurgeJobData>): Promise<void> {
  const dryRun = job.data.dryRun ?? false;
  logger.info('[retention] Starting purge', { jobId: job.id, dryRun });

  // 1. Fetch active policy for retention period
  const Policy = getPolicyModel();
  const policy = await Policy.findOne({ isActive: true }).lean();
  const retentionDays: number = (policy as any)?.retentionDays ?? 30;
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

  logger.info('[retention] Cutoff computed', { retentionDays, cutoff: cutoff.toISOString() });

  // 2. Find screenshots to purge
  const Screenshot = getScreenshotModel();
  const screenshotsToDelete = await Screenshot.find(
    { capturedAt: { $lt: cutoff } },
    { _id: 1, s3Key: 1 }
  ).lean();

  const s3Keys = screenshotsToDelete.map((s: any) => s.s3Key).filter(Boolean);
  const screenshotIds = screenshotsToDelete.map((s: any) => s._id);

  // 3. Find activity samples to purge
  const ActivitySample = getActivitySampleModel();
  const activityCount = await ActivitySample.countDocuments({ minuteBucket: { $lt: cutoff } });

  logger.info('[retention] Items to purge', {
    screenshots: screenshotsToDelete.length,
    s3Objects:   s3Keys.length,
    activitySamples: activityCount,
    dryRun,
  });

  if (dryRun) {
    logger.info('[retention] Dry run — no deletes performed');
    return;
  }

  // 4. Delete S3 objects
  const s3Deleted = await deleteS3Objects(s3Keys);

  // 5. Delete Screenshot DB records
  const dbScreenshotsDeleted = screenshotIds.length > 0
    ? (await Screenshot.deleteMany({ _id: { $in: screenshotIds } })).deletedCount
    : 0;

  // 6. Delete ActivitySample records
  const dbSamplesDeleted = activityCount > 0
    ? (await ActivitySample.deleteMany({ minuteBucket: { $lt: cutoff } })).deletedCount
    : 0;

  // 7. Write audit log
  const AuditLog = getAuditLogModel();
  await AuditLog.create({
    actorId:      'system:worker',
    action:       'RETENTION_PURGE',
    targetEntity: 'Screenshot/ActivitySample',
    details: {
      retentionDays,
      cutoff:               cutoff.toISOString(),
      s3ObjectsDeleted:     s3Deleted,
      screenshotsDeleted:   dbScreenshotsDeleted,
      activitySamplesDeleted: dbSamplesDeleted,
    },
    createdAt: new Date(),
  });

  logger.info('[retention] Purge complete', {
    jobId: job.id,
    s3ObjectsDeleted:       s3Deleted,
    screenshotsDeleted:     dbScreenshotsDeleted,
    activitySamplesDeleted: dbSamplesDeleted,
  });
}
