import { Router } from 'express';
import { registerDevice } from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { RegisterDeviceSchema } from '@teamlogger/shared';

const router = Router();

// POST /api/devices or /api/devices/register — both work
router.post('/', authenticateToken, validateRequest(RegisterDeviceSchema), registerDevice);
router.post('/register', authenticateToken, validateRequest(RegisterDeviceSchema), registerDevice);

export default router;
