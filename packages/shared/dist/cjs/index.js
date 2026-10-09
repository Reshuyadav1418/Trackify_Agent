"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHelloShared = exports.ConfirmScreenshotSchema = exports.PresignScreenshotSchema = exports.BatchActivitySchema = exports.ActivitySampleSchema = exports.UpdateManualEntrySchema = exports.CreateManualEntrySchema = exports.SyncTimeEntriesSchema = exports.SyncTimeEntryItemSchema = exports.StopTimerSchema = exports.StartTimerSchema = exports.AcceptConsentSchema = exports.CreatePolicySchema = exports.RegisterDeviceSchema = exports.UpdateTaskSchema = exports.CreateTaskSchema = exports.UpdateProjectSchema = exports.CreateProjectSchema = exports.UpdateTeamSchema = exports.CreateTeamSchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.LoginSchema = exports.UserSchema = exports.DEFAULT_SCREENSHOT_BUCKET = exports.APP_NAME = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
// Roles
exports.UserRoleSchema = zod_1.z.enum(['admin', 'manager', 'employee']);
// App Constants
exports.APP_NAME = 'TeamLogger';
exports.DEFAULT_SCREENSHOT_BUCKET = 'screenshots';
// User Schema
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    role: exports.UserRoleSchema,
    teamId: zod_1.z.string().optional().nullable(),
    createdAt: zod_1.z.date().optional(),
});
// Auth Validation Schemas
exports.LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
});
exports.CreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    name: zod_1.z.string().min(1),
    role: exports.UserRoleSchema,
    teamId: zod_1.z.string().optional().nullable(),
});
exports.UpdateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(6).optional(),
    name: zod_1.z.string().min(1).optional(),
    role: exports.UserRoleSchema.optional(),
    teamId: zod_1.z.string().optional().nullable(),
});
// Team Validation Schemas
exports.CreateTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Team name is required'),
    managerId: zod_1.z.string().optional().nullable(),
    memberIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.UpdateTeamSchema = exports.CreateTeamSchema.partial();
// Project Validation Schemas
exports.CreateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Project name is required'),
    description: zod_1.z.string().optional(),
    clientName: zod_1.z.string().optional(),
    teamIds: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['active', 'archived']).default('active'),
});
exports.UpdateProjectSchema = exports.CreateProjectSchema.partial();
// Task Validation Schemas
exports.CreateTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Task title is required'),
    description: zod_1.z.string().optional(),
    projectId: zod_1.z.string().min(1, 'Project ID is required'),
    assignedUserIds: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(['todo', 'in_progress', 'completed']).default('todo'),
});
exports.UpdateTaskSchema = exports.CreateTaskSchema.partial();
// Device Registration Schema
exports.RegisterDeviceSchema = zod_1.z.object({
    deviceName: zod_1.z.string().min(1),
    os: zod_1.z.string().min(1),
    ipAddress: zod_1.z.string().optional(),
});
// Policy Validation Schemas
exports.CreatePolicySchema = zod_1.z.object({
    version: zod_1.z.number().positive(),
    screenshotIntervalMinutes: zod_1.z.number().min(1).default(5),
    idleTimeoutMinutes: zod_1.z.number().min(1).default(5).optional(),
    isBlurEnabled: zod_1.z.boolean().default(false),
    retentionDays: zod_1.z.number().min(1).default(30),
    consentText: zod_1.z.string().min(1),
    isActive: zod_1.z.boolean().default(true),
});
exports.AcceptConsentSchema = zod_1.z.object({
    policyVersion: zod_1.z.number(),
});
// Timer Schemas
exports.StartTimerSchema = zod_1.z.object({
    taskId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
});
exports.StopTimerSchema = zod_1.z.object({
    timeEntryId: zod_1.z.string().optional(),
    durationSeconds: zod_1.z.number().optional(),
    breakSeconds: zod_1.z.number().optional(),
});
// Time Entries Sync Schema (for syncing offline time records)
exports.SyncTimeEntryItemSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional().nullable(),
    taskId: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().optional(),
    start: zod_1.z.string().datetime().or(zod_1.z.date()),
    end: zod_1.z.string().datetime().or(zod_1.z.date()).optional().nullable(),
    durationSeconds: zod_1.z.number().default(0),
    breakSeconds: zod_1.z.number().optional().default(0),
    isManualEdit: zod_1.z.boolean().optional().default(false),
    isSync: zod_1.z.boolean().optional().default(true),
});
exports.SyncTimeEntriesSchema = zod_1.z.object({
    entries: zod_1.z.array(exports.SyncTimeEntryItemSchema),
});
// Manual Entry Schemas
exports.CreateManualEntrySchema = zod_1.z.object({
    taskId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    start: zod_1.z.string().datetime().or(zod_1.z.date()),
    end: zod_1.z.string().datetime().or(zod_1.z.date()),
    reason: zod_1.z.string().min(1, 'A reason is required for manual time entries'),
});
exports.UpdateManualEntrySchema = zod_1.z.object({
    taskId: zod_1.z.string().optional(),
    projectId: zod_1.z.string().optional(),
    start: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    end: zod_1.z.string().datetime().or(zod_1.z.date()).optional(),
    reason: zod_1.z.string().min(1, 'A reason is required when modifying a time entry'),
});
// Activity Batch Ingestion Schema
exports.ActivitySampleSchema = zod_1.z.object({
    timestamp: zod_1.z.string().datetime().or(zod_1.z.date()),
    keyboardCount: zod_1.z.number().min(0),
    mouseCount: zod_1.z.number().min(0),
    isIdle: zod_1.z.boolean().optional().default(false),
    activeWindowTitle: zod_1.z.string().optional(),
    isSync: zod_1.z.boolean().optional().default(false),
});
exports.BatchActivitySchema = zod_1.z.object({
    deviceId: zod_1.z.string().optional(),
    samples: zod_1.z.array(exports.ActivitySampleSchema).min(1, 'At least one activity sample required'),
});
// Screenshot Schemas
exports.PresignScreenshotSchema = zod_1.z.object({
    deviceId: zod_1.z.string().optional(),
    timeEntryId: zod_1.z.string().optional(),
    isBlurred: zod_1.z.boolean().optional().default(false),
});
exports.ConfirmScreenshotSchema = zod_1.z.object({
    s3Key: zod_1.z.string().min(1),
    capturedAt: zod_1.z.string().datetime().or(zod_1.z.date()),
    timeEntryId: zod_1.z.string().optional(),
    deviceId: zod_1.z.string().optional(),
    isBlurred: zod_1.z.boolean().optional().default(false),
    activityScore: zod_1.z.number().min(0).max(100).optional().default(0),
});
const getHelloShared = () => ({
    message: 'Hello from @teamlogger/shared package!',
    app: exports.APP_NAME,
});
exports.getHelloShared = getHelloShared;
//# sourceMappingURL=index.js.map