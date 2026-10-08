/**
 * Nightly scheduler.
 * Enqueues the aggregation and retention jobs at midnight UTC.
 * Also enqueues alert scans every 15 minutes.
 *
 * Uses BullMQ repeatable jobs so schedules survive worker restarts.
 */

import { aggregationQueue, retentionQueue, alertQueue } from './queues';
import { logger } from './logger';

export async function startScheduler(): Promise<void> {
  // ── Nightly aggregation at 00:05 UTC ─────────────────────────────────────
  await aggregationQueue.add(
    'nightly-aggregation',
    {},
    {
      repeat: { pattern: '5 0 * * *' }, // 00:05 UTC daily
      jobId: 'nightly-aggregation',
    }
  );

  // ── Nightly retention purge at 00:30 UTC ─────────────────────────────────
  await retentionQueue.add(
    'nightly-retention',
    { dryRun: false },
    {
      repeat: { pattern: '30 0 * * *' }, // 00:30 UTC daily
      jobId: 'nightly-retention',
    }
  );

  // ── Timer overdue scan every 15 minutes ──────────────────────────────────
  // We enqueue one "scan" job; the processor will find all relevant users.
  await alertQueue.add(
    'scan-timer-overdue',
    { type: 'timer_overdue', userId: '__all__', meta: { scan: true } },
    {
      repeat: { pattern: '*/15 * * * *' },
      jobId: 'scan-timer-overdue',
    }
  );

  // ── Device silence scan every 30 minutes ─────────────────────────────────
  await alertQueue.add(
    'scan-device-silent',
    { type: 'device_silent', userId: '__all__', meta: { scan: true } },
    {
      repeat: { pattern: '*/30 * * * *' },
      jobId: 'scan-device-silent',
    }
  );

  logger.info('[Scheduler] Repeatable jobs registered', {
    jobs: ['nightly-aggregation', 'nightly-retention', 'scan-timer-overdue', 'scan-device-silent'],
  });
}
