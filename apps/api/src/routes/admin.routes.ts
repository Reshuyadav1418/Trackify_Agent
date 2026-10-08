import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/rbac.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  CreateUserSchema,
  UpdateUserSchema,
  CreateTeamSchema,
  UpdateTeamSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
} from '@teamlogger/shared';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getAuditLogs,
} from '../controllers/admin.controller';

const router = Router();

// Protect all admin routes with authentication
router.use(authenticateToken);

// Audit Logs (admin only)
router.get('/audit-logs', requireRoles('admin'), getAuditLogs);

// Users: Admin and Manager can view users, only Admin can create/update/delete
router.get('/users', requireRoles('admin', 'manager'), getUsers);
router.post('/users', requireRoles('admin'), validateRequest(CreateUserSchema), createUser);
router.put('/users/:id', requireRoles('admin'), validateRequest(UpdateUserSchema), updateUser);
router.delete('/users/:id', requireRoles('admin'), deleteUser);

// Teams: Admin and Manager can view teams, only Admin can create/update/delete
router.get('/teams', requireRoles('admin', 'manager'), getTeams);
router.post('/teams', requireRoles('admin'), validateRequest(CreateTeamSchema), createTeam);
router.put('/teams/:id', requireRoles('admin'), validateRequest(UpdateTeamSchema), updateTeam);
router.delete('/teams/:id', requireRoles('admin'), deleteTeam);

// Projects: Admin and Manager can view projects, only Admin can create/update/delete
router.get('/projects', requireRoles('admin', 'manager'), getProjects);
router.post('/projects', requireRoles('admin'), validateRequest(CreateProjectSchema), createProject);
router.put('/projects/:id', requireRoles('admin'), validateRequest(UpdateProjectSchema), updateProject);
router.delete('/projects/:id', requireRoles('admin'), deleteProject);

// Tasks: Admin and Manager can view tasks, only Admin can create/update/delete
router.get('/tasks', requireRoles('admin', 'manager'), getTasks);
router.post('/tasks', requireRoles('admin'), validateRequest(CreateTaskSchema), createTask);
router.put('/tasks/:id', requireRoles('admin'), validateRequest(UpdateTaskSchema), updateTask);
router.delete('/tasks/:id', requireRoles('admin'), deleteTask);

export default router;
