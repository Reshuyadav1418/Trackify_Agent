import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { scopeUserAccess } from '../middleware/rbac.middleware';
import { getTimeline } from '../controllers/timeline.controller';

const router = Router();

router.use(authenticateToken);
router.use(scopeUserAccess());

router.get('/', getTimeline);

export default router;
