/**
 * Job: thumbnail
 * Triggered after a screenshot is confirmed (POST /screenshots/confirm).
 * Downloads the original JPEG from S3/MinIO, resizes to 320×180, and
 * uploads back as <key>_thumb.jpg.  Updates the Screenshot document with
 * the thumb key.
 *
 * Retries: 3 × exponential backoff starting at 5 s (see queues.ts).
 * On final failure the job is moved to the dead-letter queue.
 */

import { Job } from 'bullmq';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../logger';
import { ThumbnailJobData } from '../queues';

// ── S3 client (shared per worker process) ─────────────────────────────────────
const s3 = new S3Client({
  endpoint:        config.s3Endpoint,
  region:          config.s3Region,
  credentials:     { accessKeyId: config.s3AccessKey, secretAccessKey: config.s3SecretKey },
  forcePathStyle:  true,
});

// ── Mongoose model (lazy, avoids re-registration across files) ────────────────
function getScreenshotModel(): mongoose.Model<any> {
  if (mongoose.models['Screenshot']) return mongoose.models['Screenshot'] as mongoose.Model<any>;
  const { Schema, model } = mongoose;
  const s = new Schema({ s3Key: String, thumbKey: String, userId: Schema.Types.ObjectId }, { strict: false });
  return model<any>('Screenshot', s);
}

// ── Helper: stream S3 object to Buffer ────────────────────────────────────────
async function s3ToBuffer(key: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: config.s3Bucket, Key: key });
  const res = await s3.send(cmd);
  const chunks: Uint8Array[] = [];
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ── Job handler ───────────────────────────────────────────────────────────────
export async function thumbnailProcessor(job: Job<ThumbnailJobData>): Promise<void> {
  const { screenshotId, s3Key, userId } = job.data;
  logger.info('[thumbnail] Starting', { jobId: job.id, screenshotId, s3Key });

  // 1. Download original from S3
  const originalBuffer = await s3ToBuffer(s3Key);

  // 2. Resize with sharp
  const thumbBuffer = await sharp(originalBuffer)
    .resize({ width: 320, height: 180, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 60 })
    .toBuffer();

  // 3. Upload thumbnail
  const thumbKey = s3Key.replace(/(\.[^.]+)?$/, '_thumb.jpg');
  await s3.send(new PutObjectCommand({
    Bucket:      config.s3Bucket,
    Key:         thumbKey,
    Body:        thumbBuffer,
    ContentType: 'image/jpeg',
    Metadata:    { userId, originalKey: s3Key },
  }));

  // 4. Persist thumbKey in DB
  const Screenshot = getScreenshotModel();
  await Screenshot.findByIdAndUpdate(screenshotId, { thumbKey });

  logger.info('[thumbnail] Done', { jobId: job.id, screenshotId, thumbKey, bytes: thumbBuffer.length });
}
