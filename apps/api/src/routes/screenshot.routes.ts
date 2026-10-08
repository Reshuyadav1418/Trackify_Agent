import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { scopeUserAccess } from '../middleware/rbac.middleware';
import { PresignScreenshotSchema, ConfirmScreenshotSchema } from '@teamlogger/shared';
import { presignScreenshot, confirmScreenshot, getScreenshotById, getScreenshots, deleteScreenshot } from '../controllers/screenshot.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', scopeUserAccess(), getScreenshots);
router.post('/presign', validateRequest(PresignScreenshotSchema), presignScreenshot);
router.post('/confirm', validateRequest(ConfirmScreenshotSchema), confirmScreenshot);
router.get('/:id', scopeUserAccess(), getScreenshotById);
router.delete('/:id', scopeUserAccess(), deleteScreenshot);

export default router;

