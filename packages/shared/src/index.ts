import { z } from 'zod';

// Roles
export const UserRoleSchema = z.enum(['admin', 'manager', 'employee']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// App Constants
export const APP_NAME = 'TeamLogger';
export const DEFAULT_SCREENSHOT_BUCKET = 'screenshots';

// User Schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  teamId: z.string().optional().nullable(),
  createdAt: z.date().optional(),
});
export type User = z.infer<typeof UserSchema>;

// Auth Validation Schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: UserRoleSchema,
  teamId: z.string().optional().nullable(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: UserRoleSchema.optional(),
  teamId: z.string().optional().nullable(),
});
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// Team Validation Schemas
export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  managerId: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(),
});
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = CreateTeamSchema.partial();
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;

// Project Validation Schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  clientName: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// Task Validation Schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Project ID is required'),
  assignedUserIds: z.array(z.string()).optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).default('todo'),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = CreateTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// Device Registration Schema
export const RegisterDeviceSchema = z.object({
  deviceName: z.string().min(1),
  os: z.string().min(1),
  ipAddress: z.string().optional(),
});
export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;

// Policy Validation Schemas
export const CreatePolicySchema = z.object({
  version: z.number().positive(),
  screenshotIntervalMinutes: z.number().min(1).default(5),
  isBlurEnabled: z.boolean().default(false),
  retentionDays: z.number().min(1).default(30),
  consentText: z.string().min(1),
  isActive: z.boolean().default(true),
});
export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;

export const AcceptConsentSchema = z.object({
  policyVersion: z.number(),
});
export type AcceptConsentInput = z.infer<typeof AcceptConsentSchema>;

// Timer Schemas
export const StartTimerSchema = z.object({
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  description: z.string().optional(),
});
export type StartTimerInput = z.infer<typeof StartTimerSchema>;

export const StopTimerSchema = z.object({
  timeEntryId: z.string().optional(),
});
export type StopTimerInput = z.infer<typeof StopTimerSchema>;

// Manual Entry Schemas
export const CreateManualEntrySchema = z.object({
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  start: z.string().datetime().or(z.date()),
  end: z.string().datetime().or(z.date()),
  reason: z.string().min(1, 'A reason is required for manual time entries'),
});
export type CreateManualEntryInput = z.infer<typeof CreateManualEntrySchema>;

export const UpdateManualEntrySchema = z.object({
  taskId: z.string().optional(),
  projectId: z.string().optional(),
  start: z.string().datetime().or(z.date()).optional(),
  end: z.string().datetime().or(z.date()).optional(),
  reason: z.string().min(1, 'A reason is required when modifying a time entry'),
});
export type UpdateManualEntryInput = z.infer<typeof UpdateManualEntrySchema>;

// Activity Batch Ingestion Schema
export const ActivitySampleSchema = z.object({
  timestamp: z.string().datetime().or(z.date()),
  keyboardCount: z.number().min(0),
  mouseCount: z.number().min(0),
  isIdle: z.boolean().optional().default(false),
  activeWindowTitle: z.string().optional(),
});

export const BatchActivitySchema = z.object({
  deviceId: z.string().optional(),
  samples: z.array(ActivitySampleSchema).min(1, 'At least one activity sample required'),
});
export type BatchActivityInput = z.infer<typeof BatchActivitySchema>;

// Screenshot Schemas
export const PresignScreenshotSchema = z.object({
  deviceId: z.string().optional(),
  timeEntryId: z.string().optional(),
  isBlurred: z.boolean().optional().default(false),
});
export type PresignScreenshotInput = z.infer<typeof PresignScreenshotSchema>;

export const ConfirmScreenshotSchema = z.object({
  s3Key: z.string().min(1),
  capturedAt: z.string().datetime().or(z.date()),
  timeEntryId: z.string().optional(),
  deviceId: z.string().optional(),
  isBlurred: z.boolean().optional().default(false),
  activityScore: z.number().min(0).max(100).optional().default(0),
});
export type ConfirmScreenshotInput = z.infer<typeof ConfirmScreenshotSchema>;

export interface HelloSharedResponse {
  message: string;
  app: string;
}

export const getHelloShared = (): HelloSharedResponse => ({
  message: 'Hello from @teamlogger/shared package!',
  app: APP_NAME,
});
