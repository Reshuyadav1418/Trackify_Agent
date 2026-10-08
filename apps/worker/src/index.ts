/**
 * Main worker entry point.
 * Spins up one Worker per queue, registers the dead-letter monitor,
 * and starts the nightly cron scheduler.
 *
 * Graceful shutdown on SIGTERM / SIGINT.
 */

import dotenv from 'dotenv';
dotenv.config();

import { Worker } from 'bullmq';
import { connectDB, disconnectDB } from './db';
import { logger } from './logger';
import { bullConnection } from './queues';
import {
  QUEUE_THUMBNAIL, QUEUE_AGGREGATION, QUEUE_RETENTION, QUEUE_ALERTS, QUEUE_REPORTS,
} from './queues';

import { thumbnailProcessor }        from './jobs/thumbnail.job';
import { dailyAggregationProcessor } from './jobs/dailyAggregation.job';
import { retentionPurgeProcessor }   from './jobs/retentionPurge.job';
import { alertProcessor }            from './jobs/alerts.job';
import { reportProcessor }           from './jobs/reports.job';
import { startDeadLetterMonitor }    from './deadLetter';
import { startScheduler }            from './scheduler';

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '4', 10);

async function main() {
  logger.info('[Worker] Trackify BullMQ worker starting…');

  // Connect to MongoDB
  await connectDB();

  // ── Workers ────────────────────────────────────────────────────────────────
  const workers: Worker[] = [
    new Worker(QUEUE_THUMBNAIL,   thumbnailProcessor,        { ...bullConnection, concurrency: CONCURRENCY }),
    new Worker(QUEUE_AGGREGATION, dailyAggregationProcessor, { ...bullConnection, concurrency: 1 }),
    new Worker(QUEUE_RETENTION,   retentionPurgeProcessor,   { ...bullConnection, concurrency: 1 }),
    new Worker(QUEUE_ALERTS,      alertProcessor,            { ...bullConnection, concurrency: CONCURRENCY }),
    new Worker(QUEUE_REPORTS,     reportProcessor as any,    { ...bullConnection, concurrency: 2 }),
  ];

  // ── Event logging per worker ───────────────────────────────────────────────
  for (const w of workers) {
    w.on('completed', (job) => {
      logger.info(`[${w.name}] Job completed`, { jobId: job.id, name: job.name });
    });

    w.on('failed', (job, err) => {
      logger.error(`[${w.name}] Job failed`, {
        jobId:        job?.id,
        name:         job?.name,
        attemptsMade: job?.attemptsMade,
        error:        err.message,
      });
    });

    w.on('stalled', (jobId) => {
      logger.warn(`[${w.name}] Job stalled`, { jobId });
    });

    w.on('error', (err) => {
      logger.error(`[${w.name}] Worker error`, { error: err.message });
    });
  }

  // ── Dead-letter monitor ────────────────────────────────────────────────────
  startDeadLetterMonitor();

  // ── Nightly scheduler ─────────────────────────────────────────────────────
  await startScheduler();

  logger.info('[Worker] All workers running', {
    queues:      workers.map((w) => w.name),
    concurrency: CONCURRENCY,
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`[Worker] Received ${signal}. Shutting down gracefully…`);
    await Promise.all(workers.map((w) => w.close()));
    await disconnectDB();
    logger.info('[Worker] Shutdown complete.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('[Worker] Fatal startup error', { error: String(err) });
  process.exit(1);
});
