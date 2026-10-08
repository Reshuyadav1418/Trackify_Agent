import { api } from './client';
import {
  LoginInput,
  CreateUserInput,
  UpdateUserInput,
  CreateTeamInput,
  UpdateTeamInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreatePolicyInput,
  CreateManualEntryInput,
  UpdateManualEntryInput,
} from '@teamlogger/shared';

// Auth
export const loginApi = async (data: LoginInput) => {
  const res = await api.post('/api/auth/login', data);
  return res.data;
};

export const logoutApi = async () => {
  const res = await api.post('/api/auth/logout');
  return res.data;
};

export const getMeApi = async () => {
  const res = await api.get('/api/auth/me');
  return res.data;
};

// Policies & Consents
export const getActivePolicyApi = async () => {
  const res = await api.get('/api/policies/active');
  return res.data;
};

export const getConsentStatusApi = async () => {
  const res = await api.get('/api/policies/consent-status');
  return res.data;
};

export const acceptConsentApi = async (policyVersion: number) => {
  const res = await api.post('/api/policies/consent', { policyVersion });
  return res.data;
};


export const getAllPoliciesApi = async () => {
  const res = await api.get('/api/policies');
  return res.data;
};

export const createPolicyApi = async (data: CreatePolicyInput) => {
  const res = await api.post('/api/policies', data);
  return res.data;
};

// Users Admin
export const getUsersApi = async () => {
  const res = await api.get('/api/admin/users');
  return res.data;
};

export const createUserApi = async (data: CreateUserInput) => {
  const res = await api.post('/api/admin/users', data);
  return res.data;
};

export const updateUserApi = async (id: string, data: UpdateUserInput) => {
  const res = await api.put(`/api/admin/users/${id}`, data);
  return res.data;
};

export const deleteUserApi = async (id: string) => {
  const res = await api.delete(`/api/admin/users/${id}`);
  return res.data;
};

// Teams Admin
export const getTeamsApi = async () => {
  const res = await api.get('/api/admin/teams');
  return res.data;
};

export const createTeamApi = async (data: CreateTeamInput) => {
  const res = await api.post('/api/admin/teams', data);
  return res.data;
};

export const updateTeamApi = async (id: string, data: UpdateTeamInput) => {
  const res = await api.put(`/api/admin/teams/${id}`, data);
  return res.data;
};

export const deleteTeamApi = async (id: string) => {
  const res = await api.delete(`/api/admin/teams/${id}`);
  return res.data;
};

// Projects & Tasks Admin
export const getProjectsApi = async () => {
  const res = await api.get('/api/admin/projects');
  return res.data;
};

export const createProjectApi = async (data: CreateProjectInput) => {
  const res = await api.post('/api/admin/projects', data);
  return res.data;
};

export const updateProjectApi = async (id: string, data: UpdateProjectInput) => {
  const res = await api.put(`/api/admin/projects/${id}`, data);
  return res.data;
};

export const deleteProjectApi = async (id: string) => {
  const res = await api.delete(`/api/admin/projects/${id}`);
  return res.data;
};

export const getTasksApi = async () => {
  const res = await api.get('/api/admin/tasks');
  return res.data;
};

export const createTaskApi = async (data: CreateTaskInput) => {
  const res = await api.post('/api/admin/tasks', data);
  return res.data;
};

export const updateTaskApi = async (id: string, data: UpdateTaskInput) => {
  const res = await api.put(`/api/admin/tasks/${id}`, data);
  return res.data;
};

export const deleteTaskApi = async (id: string) => {
  const res = await api.delete(`/api/admin/tasks/${id}`);
  return res.data;
};

// Timers & Manual Entries
export const startTimerApi = async (data?: { taskId?: string; projectId?: string; description?: string }) => {
  const res = await api.post('/api/timers/start', data || {});
  return res.data;
};

export const stopTimerApi = async (timeEntryId?: string) => {
  const res = await api.post('/api/timers/stop', { timeEntryId });
  return res.data;
};

export const createManualEntryApi = async (data: CreateManualEntryInput) => {
  const res = await api.post('/api/entries/manual', data);
  return res.data;
};

export const updateManualEntryApi = async (id: string, data: UpdateManualEntryInput) => {
  const res = await api.patch(`/api/entries/${id}`, data);
  return res.data;
};

export const getTimeEntriesApi = async (params?: any): Promise<any> => {
  const cleanParams = params && typeof params === 'object' && ('userId' in params || 'startDate' in params) ? params : undefined;
  const res = await api.get('/api/time-entries', { params: cleanParams });
  return res.data;
};

export const deleteTimeEntryApi = async (id: string) => {
  const res = await api.delete(`/api/time-entries/${id}`);
  return res.data;
};

export const updateTimeEntryNotesApi = async (id: string, description: string) => {
  const res = await api.patch(`/api/time-entries/${id}/notes`, { description });
  return res.data;
};

// Screenshots
export const getScreenshotByIdApi = async (id: string) => {
  const res = await api.get(`/api/screenshots/${id}`);
  return res.data;
};

export const getScreenshotsApi = async (params?: { userId?: string; startDate?: string; endDate?: string }) => {
  const res = await api.get('/api/screenshots', { params });
  return res.data;
};

export const deleteScreenshotApi = async (id: string) => {
  const res = await api.delete(`/api/screenshots/${id}`);
  return res.data;
};

// Audit Logs
export const getAuditLogsApi = async () => {
  const res = await api.get('/api/admin/audit-logs');
  return res.data;
};

// Reports
export const getTimesheetReportApi = async (params?: Record<string, string>) => {
  const res = await api.get('/api/reports/timesheet', { params });
  return res.data;
};

export const getActivityReportApi = async (params?: Record<string, string>) => {
  const res = await api.get('/api/reports/activity', { params });
  return res.data;
};

export const getProjectsReportApi = async (params?: Record<string, string>) => {
  const res = await api.get('/api/reports/projects', { params });
  return res.data;
};

export const exportReportCsvApi = async (type: 'timesheet' | 'activity' | 'projects', params?: Record<string, string>) => {
  const res = await api.get(`/api/reports/${type}`, {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  });
  return res.data;
};
