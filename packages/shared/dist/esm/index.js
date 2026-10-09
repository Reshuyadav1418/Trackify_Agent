import { z } from 'zod';
// Roles
export const UserRoleSchema = z.enum(['admin', 'manager', 'employee']);
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
// Auth Validation Schemas
export const LoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});
export const CreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: UserRoleSchema,
    teamId: z.string().optional().nullable(),
});
export const UpdateUserSchema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    name: z.string().min(1).optional(),
    role: UserRoleSchema.optional(),
    teamId: z.string().optional().nullable(),
});
// Team Validation Schemas
export const CreateTeamSchema = z.object({
    name: z.string().min(1, 'Team name is required'),
    managerId: z.string().optional().nullable(),
    memberIds: z.array(z.string()).optional(),
});
export const UpdateTeamSchema = CreateTeamSchema.partial();
// Project Validation Schemas
export const CreateProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    clientName: z.string().optional(),
    teamIds: z.array(z.string()).optional(),
    status: z.enum(['active', 'archived']).default('active'),
});
export const UpdateProjectSchema = CreateProjectSchema.partial();
// Task Validation Schemas
export const CreateTaskSchema = z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    projectId: z.string().min(1, 'Project ID is required'),
    assignedUserIds: z.array(z.string()).optional(),
    status: z.enum(['todo', 'in_progress', 'completed']).default('todo'),
});
export const UpdateTaskSchema = CreateTaskSchema.partial();
// Device Registration Schema
export const RegisterDeviceSchema = z.object({
    deviceName: z.string().min(1),
    os: z.string().min(1),
    ipAddress: z.string().optional(),
});
// Policy Validation Schemas
export const CreatePolicySchema = z.object({
    version: z.number().positive(),
    screenshotIntervalMinutes: z.number().min(1).default(5),
    idleTimeoutMinutes: z.number().min(1).default(5).optional(),
    isBlurEnabled: z.boolean().default(false),
    retentionDays: z.number().min(1).default(30),
    consentText: z.string().min(1),
    isActive: z.boolean().default(true),
});
export const AcceptConsentSchema = z.object({
    policyVersion: z.number(),
});
// Timer Schemas
export const StartTimerSchema = z.object({
    taskId: z.string().optional(),
    projectId: z.string().optional(),
    description: z.string().optional(),
});
export const StopTimerSchema = z.object({
    timeEntryId: z.string().optional(),
    durationSeconds: z.number().optional(),
    breakSeconds: z.number().optional(),
});
// Time Entries Sync Schema (for syncing offline time records)
export const SyncTimeEntryItemSchema = z.object({
    id: z.string().optional(),
    projectId: z.string().optional().nullable(),
    taskId: z.string().optional().nullable(),
    description: z.string().optional(),
    start: z.string().datetime().or(z.date()),
    end: z.string().datetime().or(z.date()).optional().nullable(),
    durationSeconds: z.number().default(0),
    breakSeconds: z.number().optional().default(0),
    isManualEdit: z.boolean().optional().default(false),
    isSync: z.boolean().optional().default(true),
});
export const SyncTimeEntriesSchema = z.object({
    entries: z.array(SyncTimeEntryItemSchema),
});
// Manual Entry Schemas
export const CreateManualEntrySchema = z.object({
    taskId: z.string().optional(),
    projectId: z.string().optional(),
    start: z.string().datetime().or(z.date()),
    end: z.string().datetime().or(z.date()),
    reason: z.string().min(1, 'A reason is required for manual time entries'),
});
export const UpdateManualEntrySchema = z.object({
    taskId: z.string().optional(),
    projectId: z.string().optional(),
    start: z.string().datetime().or(z.date()).optional(),
    end: z.string().datetime().or(z.date()).optional(),
    reason: z.string().min(1, 'A reason is required when modifying a time entry'),
});
// Activity Batch Ingestion Schema
export const ActivitySampleSchema = z.object({
    timestamp: z.string().datetime().or(z.date()),
    keyboardCount: z.number().min(0),
    mouseCount: z.number().min(0),
    isIdle: z.boolean().optional().default(false),
    activeWindowTitle: z.string().optional(),
    isSync: z.boolean().optional().default(false),
});
export const BatchActivitySchema = z.object({
    deviceId: z.string().optional(),
    samples: z.array(ActivitySampleSchema).min(1, 'At least one activity sample required'),
});
// Screenshot Schemas
export const PresignScreenshotSchema = z.object({
    deviceId: z.string().optional(),
    timeEntryId: z.string().optional(),
    isBlurred: z.boolean().optional().default(false),
});
export const ConfirmScreenshotSchema = z.object({
    s3Key: z.string().min(1),
    capturedAt: z.string().datetime().or(z.date()),
    timeEntryId: z.string().optional(),
    deviceId: z.string().optional(),
    isBlurred: z.boolean().optional().default(false),
    activityScore: z.number().min(0).max(100).optional().default(0),
});
export const getHelloShared = () => ({
    message: 'Hello from @teamlogger/shared package!',
    app: APP_NAME,
});
//# sourceMappingURL=index.js.map