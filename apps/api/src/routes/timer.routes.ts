import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { StartTimerSchema, StopTimerSchema } from '@teamlogger/shared';
import { startTimer, stopTimer, getStaleTimers } from '../controllers/timer.controller';
import { scopeUserAccess } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/start', validateRequest(StartTimerSchema), startTimer);
router.post('/stop', validateRequest(StopTimerSchema), stopTimer);
router.get('/stale', scopeUserAccess(), getStaleTimers);

export default router;
