import dotenv from 'dotenv';
dotenv.config();

export const config = {
  mongoUri:    process.env.MONGODB_URI || 'mongodb://localhost:27018/teamlogger',
  redisUrl:    process.env.REDIS_URL   || 'redis://localhost:6379',
  s3Bucket:    process.env.S3_BUCKET   || 'trackify-screenshots',
  s3Endpoint:  process.env.S3_ENDPOINT || 'http://localhost:9000',
  s3Region:    process.env.S3_REGION   || 'us-east-1',
  s3AccessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
  s3SecretKey: process.env.S3_SECRET_KEY || 'minioadmin',
  // Thresholds
  timerOverdueHours:   parseInt(process.env.TIMER_OVERDUE_HOURS   || '12',  10),
  deviceSilentMinutes: parseInt(process.env.DEVICE_SILENT_MINUTES || '120', 10),
};
