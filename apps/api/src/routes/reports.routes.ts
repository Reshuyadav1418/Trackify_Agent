import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { scopeUserAccess } from '../middleware/rbac.middleware';
import { getTimesheetReport, getActivityReport, getProjectsReport, generateReportAsync, getReportJobStatus } from '../controllers/reports.controller';

const router = Router();

router.use(authenticateToken, scopeUserAccess());

router.get('/timesheet', getTimesheetReport);
router.get('/activity',  getActivityReport);
router.get('/projects',  getProjectsReport);

// Async heavy report generation via BullMQ
router.post('/generate', generateReportAsync);
router.get('/status/:jobId', getReportJobStatus);

export default router;

