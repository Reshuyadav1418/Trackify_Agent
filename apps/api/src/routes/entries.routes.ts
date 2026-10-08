import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { scopeUserAccess } from '../middleware/rbac.middleware';
import { CreateManualEntrySchema, UpdateManualEntrySchema } from '@teamlogger/shared';
import { createManualEntry, updateManualEntry } from '../controllers/entries.controller';

const router = Router();

router.use(authenticateToken);

router.post('/manual', validateRequest(CreateManualEntrySchema), createManualEntry);
router.patch('/:id', scopeUserAccess(), validateRequest(UpdateManualEntrySchema), updateManualEntry);

export default router;
