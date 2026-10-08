/**
 * Shared MongoDB connection for the worker process.
 * Uses the same URI as the API so they share the same DB.
 */

import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './logger';

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  await mongoose.connect(config.mongoUri);
  connected = true;
  logger.info('[DB] MongoDB connected', { uri: config.mongoUri.replace(/\/\/.*@/, '//***@') });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  connected = false;
}
