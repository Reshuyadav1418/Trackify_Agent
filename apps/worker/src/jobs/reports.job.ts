/**
 * Job: reports
 * Async heavy report generation.
 * Generates one of three report types as JSON, uploads to S3, and stores
 * the S3 key so the API can return a presigned download URL.
 *
 * reportType: 'timesheet' | 'activity' | 'projects'
 */

import { Job } from 'bullmq';
import mongoose, { Schema, model } from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { ReportJobData } from '../queues';
import { logger } from '../logger';
import { config } from '../config';

const s3 = new S3Client({
  endpoint:       config.s3Endpoint,
  region:         config.s3Region,
  credentials:    { accessKeyId: config.s3AccessKey, secretAccessKey: config.s3SecretKey },
  forcePathStyle: true,
});

function getModel(name: string, schemaDef: Record<string, unknown>): mongoose.Model<any> {
  if (mongoose.models[name]) return mongoose.models[name] as mongoose.Model<any>;
  return model<any>(name, new Schema(schemaDef, { strict: false }));
}

// ── Report generators ─────────────────────────────────────────────────────────
async function generateTimesheet(params: Record<string, unknown>): Promise<object[]> {
  const TimeEntry = getModel('TimeEntry', {
    userId: Schema.Types.ObjectId,
    start: Date, end: Date,
    durationSeconds: Number,
    isManualEdit: Boolean,
    projectId: Schema.Types.ObjectId,
    taskId: Schema.Types.ObjectId,
  });

  const { startDate, endDate, userId } = params as any;
  const match: Record<string, unknown> = {};
  if (startDate) match['start'] = { $gte: new Date(startDate) };
  if (endDate)   (match['start'] as any)['$lte'] = new Date(endDate);
  if (userId)    match['userId'] = new mongoose.Types.ObjectId(userId);

  return TimeEntry.find(match).lean();
}

async function generateActivity(params: Record<string, unknown>): Promise<object[]> {
  const ActivitySample = getModel('ActivitySample', {
    userId: Schema.Types.ObjectId,
    minuteBucket: Date,
    keyboardCount: Number,
    mouseCount: Number,
    isIdle: Boolean,
  });

  const { startDate, endDate, userId } = params as any;
  const match: Record<string, unknown> = {};
  if (startDate) match['minuteBucket'] = { $gte: new Date(startDate) };
  if (endDate)   (match['minuteBucket'] as any)['$lte'] = new Date(endDate);
  if (userId)    match['userId'] = new mongoose.Types.ObjectId(userId);

  return ActivitySample.aggregate([
    { $match: match },
    { $group: {
      _id: { userId: '$userId', date: { $dateToString: { format: '%Y-%m-%d', date: '$minuteBucket' } } },
      totalKeyboard: { $sum: '$keyboardCount' },
      totalMouse:    { $sum: '$mouseCount' },
      activeMinutes: { $sum: { $cond: ['$isIdle', 0, 1] } },
      idleMinutes:   { $sum: { $cond: ['$isIdle', 1, 0] } },
    }},
    { $sort: { '_id.date': 1 } },
  ]);
}

async function generateProjectsReport(params: Record<string, unknown>): Promise<object[]> {
  const TimeEntry = getModel('TimeEntry', {
    userId: Schema.Types.ObjectId, projectId: Schema.Types.ObjectId,
    durationSeconds: Number, start: Date,
  });

  const { startDate, endDate } = params as any;
  const match: Record<string, unknown> = { projectId: { $ne: null } };
  if (startDate) match['start'] = { $gte: new Date(startDate) };
  if (endDate)   (match['start'] as any)['$lte'] = new Date(endDate);

  return TimeEntry.aggregate([
    { $match: match },
    { $group: {
      _id: '$projectId',
      totalSeconds: { $sum: '$durationSeconds' },
      entries:      { $sum: 1 },
      users:        { $addToSet: '$userId' },
    }},
    { $project: {
      projectId:    '$_id',
      totalSeconds: 1,
      totalHours:   { $round: [{ $divide: ['$totalSeconds', 3600] }, 2] },
      entries:      1,
      userCount:    { $size: '$users' },
    }},
    { $sort: { totalSeconds: -1 } },
  ]);
}

// ── Job handler ───────────────────────────────────────────────────────────────
export async function reportProcessor(job: Job<ReportJobData>): Promise<{ outputKey: string }> {
  const { reportType, requestedBy, params } = job.data;
  logger.info('[reports] Starting', { jobId: job.id, reportType, requestedBy });

  await job.updateProgress(10);

  // Generate data
  let data: object[];
  switch (reportType) {
    case 'timesheet': data = await generateTimesheet(params); break;
    case 'activity':  data = await generateActivity(params);  break;
    case 'projects':  data = await generateProjectsReport(params); break;
    default: throw new Error(`Unknown report type: ${reportType}`);
  }

  await job.updateProgress(70);

  // Serialise
  const payload = JSON.stringify({ reportType, generatedAt: new Date(), requestedBy, params, data }, null, 2);
  const outputKey = `reports/${requestedBy}/${reportType}_${Date.now()}.json`;

  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket:      config.s3Bucket,
    Key:         outputKey,
    Body:        payload,
    ContentType: 'application/json',
  }));

  await job.updateProgress(100);
  logger.info('[reports] Done', { jobId: job.id, outputKey, rows: data.length });

  // Return key so the caller can build a presigned download URL
  return { outputKey };
}
