import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27018/teamlogger',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'super-secret-access-token-key-change-in-prod',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-token-key-change-in-prod',
  jwtAccessExpiration: '15m',
  jwtRefreshExpiration: '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'super-secret-cookie-signing-key',
};
