/**
 * Shared BullMQ queue client for the API process.
 * The API only ENQUEUES — it never runs workers itself.
 * Import from here to avoid creating duplicate Queue instances.
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const apiRedis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
  lazyConnect:          true,
});

// Job data types (duplicated here to avoid cross-app imports)
export interface ThumbnailJobData  { screenshotId: string; s3Key: string; userId: string; }
export interface AlertJobData      { type: 'timer_overdue' | 'device_silent'; userId: string; meta: Record<string, unknown>; }
export interface ReportJobData     { reportType: 'timesheet' | 'activity' | 'projects'; requestedBy: string; params: Record<string, unknown>; outputKey?: string; }

const defaultOpts = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { count: 200 },
  removeOnFail:     { count: 500 },
};

export const thumbnailQueue = new Queue('thumbnail', { connection: apiRedis as any, defaultJobOptions: defaultOpts });
export const alertQueue     = new Queue('alerts',    { connection: apiRedis as any, defaultJobOptions: defaultOpts });
export const reportQueue    = new Queue('reports',   { connection: apiRedis as any, defaultJobOptions: { ...defaultOpts, attempts: 2 } });
