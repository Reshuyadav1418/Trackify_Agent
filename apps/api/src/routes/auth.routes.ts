import { Router } from 'express';
import { login, refresh, logout, getMe } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { LoginSchema } from '@teamlogger/shared';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', validateRequest(LoginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getMe);

export default router;
