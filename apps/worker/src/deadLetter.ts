/**
 * Dead-letter queue handler.
 * Listens to all failed jobs across every queue and routes them to the
 * dead-letter queue with structured metadata for human review.
 */

import { QueueEvents } from 'bullmq';
import { dlq, bullConnection, QUEUE_THUMBNAIL, QUEUE_AGGREGATION, QUEUE_RETENTION, QUEUE_ALERTS, QUEUE_REPORTS } from './queues';
import { logger } from './logger';

const QUEUES_TO_MONITOR = [
  QUEUE_THUMBNAIL,
  QUEUE_AGGREGATION,
  QUEUE_RETENTION,
  QUEUE_ALERTS,
  QUEUE_REPORTS,
];

export function startDeadLetterMonitor(): void {
  for (const queueName of QUEUES_TO_MONITOR) {
    const events = new QueueEvents(queueName, bullConnection);

    events.on('failed', async ({ jobId, failedReason }) => {
      logger.error(`[DLQ] Job failed in queue "${queueName}"`, {
        jobId,
        failedReason,
        queue: queueName,
      });

      try {
        await dlq.add('failed-job', {
          originalQueue: queueName,
          jobId,
          failedReason,
          failedAt: new Date().toISOString(),
        }, {
          removeOnComplete: { count: 1000 },
          removeOnFail:     false,
        });
      } catch (err) {
        logger.error('[DLQ] Could not enqueue to DLQ', { err: String(err) });
      }
    });
  }

  logger.info('[DLQ] Dead-letter monitor started', { queues: QUEUES_TO_MONITOR });
}
