import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { CreatePolicySchema, AcceptConsentSchema } from '@teamlogger/shared';
import { getActivePolicy, getPolicies, createPolicy, acceptConsent, getConsentStatus } from '../controllers/policy.controller';

const router = Router();

// Public / Authenticated endpoints
router.get('/active', getActivePolicy);
router.get('/consent-status', authenticateToken, getConsentStatus);
router.post('/consent', authenticateToken, validateRequest(AcceptConsentSchema), acceptConsent);


// Admin-only policy management
router.get('/', authenticateToken, requireRoles('admin'), getPolicies);
router.post('/', authenticateToken, requireRoles('admin'), validateRequest(CreatePolicySchema), createPolicy);

export default router;
