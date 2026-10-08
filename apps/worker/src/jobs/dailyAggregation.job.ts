/**
 * Job: daily-aggregation
 * Runs nightly (or on-demand). Aggregates per-minute activitySamples into
 * a DailySummary document (upsert).  One summary per user per date.
 *
 * DailySummary fields:
 *   userId, date (YYYY-MM-DD), totalKeyboardEvents, totalMouseEvents,
 *   activeMinutes, idleMinutes, totalMinutes, activityPercent
 */

import { Job } from 'bullmq';
import mongoose, { Schema, model, Document, Model } from 'mongoose';
import { DailyAggregationJobData } from '../queues';
import { logger } from '../logger';

// ── DailySummary model ────────────────────────────────────────────────────────
interface IDailySummary extends Document {
  userId:               Schema.Types.ObjectId;
  date:                 string;       // YYYY-MM-DD
  totalKeyboardEvents:  number;
  totalMouseEvents:     number;
  activeMinutes:        number;
  idleMinutes:          number;
  totalMinutes:         number;
  activityPercent:      number;
  generatedAt:          Date;
}

function getDailySummaryModel(): Model<IDailySummary> {
  if (mongoose.models['DailySummary']) return mongoose.models['DailySummary'] as Model<IDailySummary>;
  const s = new Schema<IDailySummary>({
    userId:               { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:                 { type: String, required: true },
    totalKeyboardEvents:  { type: Number, default: 0 },
    totalMouseEvents:     { type: Number, default: 0 },
    activeMinutes:        { type: Number, default: 0 },
    idleMinutes:          { type: Number, default: 0 },
    totalMinutes:         { type: Number, default: 0 },
    activityPercent:      { type: Number, default: 0 },
    generatedAt:          { type: Date,   default: Date.now },
  }, { timestamps: false });
  s.index({ userId: 1, date: 1 }, { unique: true });
  return model<IDailySummary>('DailySummary', s);
}

function getActivitySampleModel() {
  return mongoose.models['ActivitySample'] || (() => {
    const s = new Schema({
      userId:        Schema.Types.ObjectId,
      minuteBucket:  Date,
      keyboardCount: Number,
      mouseCount:    Number,
      isIdle:        Boolean,
    }, { strict: false });
    return model('ActivitySample', s);
  })();
}

// ── Helper ────────────────────────────────────────────────────────────────────
function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Job handler ───────────────────────────────────────────────────────────────
export async function dailyAggregationProcessor(job: Job<DailyAggregationJobData>): Promise<void> {
  const targetDate = job.data.date || toDateString(new Date(Date.now() - 86_400_000)); // yesterday
  logger.info('[aggregation] Starting', { jobId: job.id, targetDate, userId: job.data.userId ?? 'all' });

  const dayStart = new Date(`${targetDate}T00:00:00.000Z`);
  const dayEnd   = new Date(`${targetDate}T23:59:59.999Z`);

  const ActivitySample = getActivitySampleModel();
  const DailySummary   = getDailySummaryModel();

  // Aggregate per user for the target date
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        minuteBucket: { $gte: dayStart, $lte: dayEnd },
        ...(job.data.userId ? { userId: new mongoose.Types.ObjectId(job.data.userId) } : {}),
      },
    },
    {
      $group: {
        _id:                  '$userId',
        totalKeyboardEvents:  { $sum: '$keyboardCount' },
        totalMouseEvents:     { $sum: '$mouseCount' },
        totalMinutes:         { $sum: 1 },
        activeMinutes:        { $sum: { $cond: ['$isIdle', 0, 1] } },
        idleMinutes:          { $sum: { $cond: ['$isIdle', 1, 0] } },
      },
    },
  ];

  const results = await ActivitySample.aggregate(pipeline);

  let upserted = 0;
  for (const row of results) {
    const activityPercent = row.totalMinutes > 0
      ? Math.round((row.activeMinutes / row.totalMinutes) * 100)
      : 0;

    await DailySummary.findOneAndUpdate(
      { userId: row._id, date: targetDate },
      {
        $set: {
          totalKeyboardEvents: row.totalKeyboardEvents,
          totalMouseEvents:    row.totalMouseEvents,
          activeMinutes:       row.activeMinutes,
          idleMinutes:         row.idleMinutes,
          totalMinutes:        row.totalMinutes,
          activityPercent,
          generatedAt:         new Date(),
        },
      },
      { upsert: true, new: true }
    );
    upserted++;
  }

  logger.info('[aggregation] Done', { jobId: job.id, targetDate, usersProcessed: upserted });
  await job.updateProgress(100);
}
