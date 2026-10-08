import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { BatchActivitySchema } from '@teamlogger/shared';
import { batchActivity } from '../controllers/activity.controller';

const router = Router();

router.use(authenticateToken);

router.post('/batch', validateRequest(BatchActivitySchema), batchActivity);

export default router;
