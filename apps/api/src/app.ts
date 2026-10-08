import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';
import adminRoutes from './routes/admin.routes';
import policyRoutes from './routes/policy.routes';
import timeEntryRoutes from './routes/timeEntry.routes';
import timerRoutes from './routes/timer.routes';
import entriesRoutes from './routes/entries.routes';
import activityRoutes from './routes/activity.routes';
import screenshotRoutes from './routes/screenshot.routes';
import reportsRoutes from './routes/reports.routes';

import { errorHandler } from './middleware/error.middleware';
import { getHelloShared } from '@teamlogger/shared';

export const createApp = () => {
  const app = express();

  // 1. Helmet security headers
  app.use(helmet());

  // 2. CORS configuration
  app.use(
    cors({
      origin: process.env.CLIENT_URL || true,
      credentials: true,
    })
  );

  // 3. Cookie parser
  app.use(cookieParser());

  // 4. Body parser
  app.use(express.json());

  // 5. Rate limiting (relaxed in test env)
  if (process.env.NODE_ENV !== 'test') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 300, // limit each IP to 300 requests per window
      message: { error: 'Too many requests from this IP, please try again later.' },
    });
    app.use('/api', limiter);
  }

  // Health and root check
  app.get('/', (_req, res) => {
    res.json({
      app: 'TeamLogger API',
      status: 'ok',
      shared: getHelloShared(),
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // 6. Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/devices', deviceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/policies', policyRoutes);
  app.use('/api/time-entries', timeEntryRoutes);

  // Authenticated projects & tasks access for timer picker
  const { authenticateToken } = require('./middleware/auth.middleware');
  const { getProjects, getTasks } = require('./controllers/admin.controller');
  app.get('/api/projects', authenticateToken, getProjects);
  app.get('/api/tasks', authenticateToken, getTasks);

  // New feature endpoints
  app.use('/api/timers', timerRoutes);
  app.use('/api/entries', entriesRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/screenshots', screenshotRoutes);
  app.use('/api/reports', reportsRoutes);


  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
};
