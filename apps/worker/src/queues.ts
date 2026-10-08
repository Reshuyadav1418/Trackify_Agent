/**
 * Centralised BullMQ queue + connection definitions.
 * Every queue and its job-data types are declared here.
 * Import queues from this file everywhere — never create ad-hoc Queue instances.
 */

import { Queue, QueueEvents, ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config';

// ── Shared Redis connection ───────────────────────────────────────────────────
export const redisConnection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
});

export const bullConnection = { connection: redisConnection };

// ── Job data types ────────────────────────────────────────────────────────────

export interface ThumbnailJobData {
  screenshotId: string;
  s3Key:        string;
  userId:       string;
}

export interface DailyAggregationJobData {
  date?: string;       // ISO date string YYYY-MM-DD; defaults to yesterday
  userId?: string;     // optional – if omitted, aggregates all users
}

export interface RetentionPurgeJobData {
  dryRun?: boolean;    // if true, logs but does not delete
}

export interface AlertJobData {
  type:   'timer_overdue' | 'device_silent';
  userId: string;
  meta:   Record<string, unknown>;
}

export interface ReportJobData {
  reportType: 'timesheet' | 'activity' | 'projects';
  requestedBy: string;    // userId who requested
  params:      Record<string, unknown>;
  outputKey?:  string;    // S3 key for storing result (set by worker)
}

// ── Queue names (constants) ───────────────────────────────────────────────────
export const QUEUE_THUMBNAIL   = 'thumbnail';
export const QUEUE_AGGREGATION = 'daily-aggregation';
export const QUEUE_RETENTION   = 'retention-purge';
export const QUEUE_ALERTS      = 'alerts';
export const QUEUE_REPORTS     = 'reports';
export const QUEUE_DLQ         = 'dead-letter';

// ── Default job options ───────────────────────────────────────────────────────
const defaultOpts = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { count: 200 },
  removeOnFail:     { count: 500 },
};

// ── Queues ────────────────────────────────────────────────────────────────────
export const thumbnailQueue   = new Queue<ThumbnailJobData>  (QUEUE_THUMBNAIL,   { connection: redisConnection, defaultJobOptions: defaultOpts });
export const aggregationQueue = new Queue<DailyAggregationJobData>(QUEUE_AGGREGATION, { connection: redisConnection, defaultJobOptions: defaultOpts });
export const retentionQueue   = new Queue<RetentionPurgeJobData>  (QUEUE_RETENTION,   { connection: redisConnection, defaultJobOptions: defaultOpts });
export const alertQueue       = new Queue<AlertJobData>      (QUEUE_ALERTS,      { connection: redisConnection, defaultJobOptions: defaultOpts });
export const reportQueue      = new Queue<ReportJobData>     (QUEUE_REPORTS,     { connection: redisConnection, defaultJobOptions: { ...defaultOpts, attempts: 2 } });
export const dlq              = new Queue                    (QUEUE_DLQ,         { connection: redisConnection });

// ── Queue Events (for monitoring) ────────────────────────────────────────────
export const thumbnailEvents   = new QueueEvents(QUEUE_THUMBNAIL,   { connection: redisConnection });
export const aggregationEvents = new QueueEvents(QUEUE_AGGREGATION, { connection: redisConnection });
export const retentionEvents   = new QueueEvents(QUEUE_RETENTION,   { connection: redisConnection });
export const alertEvents       = new QueueEvents(QUEUE_ALERTS,      { connection: redisConnection });
export const reportEvents      = new QueueEvents(QUEUE_REPORTS,     { connection: redisConnection });
