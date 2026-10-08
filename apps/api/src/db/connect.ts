import mongoose from 'mongoose';
import { config } from '../config/env';

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const connectionUri = uri || config.mongoUri;
  try {
    const conn = await mongoose.connect(connectionUri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
};
