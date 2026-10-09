import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["admin", "manager", "employee"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const APP_NAME = "TeamLogger";
export declare const DEFAULT_SCREENSHOT_BUCKET = "screenshots";
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["admin", "manager", "employee"]>;
    teamId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string;
    role: "admin" | "manager" | "employee";
    teamId?: string | null | undefined;
    createdAt?: Date | undefined;
}, {
    id: string;
    email: string;
    name: string;
    role: "admin" | "manager" | "employee";
    teamId?: string | null | undefined;
    createdAt?: Date | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const CreateUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["admin", "manager", "employee"]>;
    teamId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    role: "admin" | "manager" | "employee";
    password: string;
    teamId?: string | null | undefined;
}, {
    email: string;
    name: string;
    role: "admin" | "manager" | "employee";
    password: string;
    teamId?: string | null | undefined;
}>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["admin", "manager", "employee"]>>;
    teamId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    name?: string | undefined;
    role?: "admin" | "manager" | "employee" | undefined;
    teamId?: string | null | undefined;
    password?: string | undefined;
}, {
    email?: string | undefined;
    name?: string | undefined;
    role?: "admin" | "manager" | "employee" | undefined;
    teamId?: string | null | undefined;
    password?: string | undefined;
}>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export declare const CreateTeamSchema: z.ZodObject<{
    name: z.ZodString;
    managerId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    memberIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    managerId?: string | null | undefined;
    memberIds?: string[] | undefined;
}, {
    name: string;
    managerId?: string | null | undefined;
    memberIds?: string[] | undefined;
}>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export declare const UpdateTeamSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    memberIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    managerId?: string | null | undefined;
    memberIds?: string[] | undefined;
}, {
    name?: string | undefined;
    managerId?: string | null | undefined;
    memberIds?: string[] | undefined;
}>;
export type UpdateTeamInput = z.infer<typeof UpdateTeamSchema>;
export declare const CreateProjectSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    clientName: z.ZodOptional<z.ZodString>;
    teamIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodDefault<z.ZodEnum<["active", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "archived";
    name: string;
    description?: string | undefined;
    clientName?: string | undefined;
    teamIds?: string[] | undefined;
}, {
    name: string;
    status?: "active" | "archived" | undefined;
    description?: string | undefined;
    clientName?: string | undefined;
    teamIds?: string[] | undefined;
}>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export declare const UpdateProjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    clientName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    teamIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "archived"]>>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "archived" | undefined;
    name?: string | undefined;
    description?: string | undefined;
    clientName?: string | undefined;
    teamIds?: string[] | undefined;
}, {
    status?: "active" | "archived" | undefined;
    name?: string | undefined;
    description?: string | undefined;
    clientName?: string | undefined;
    teamIds?: string[] | undefined;
}>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export declare const CreateTaskSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    projectId: z.ZodString;
    assignedUserIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodDefault<z.ZodEnum<["todo", "in_progress", "completed"]>>;
}, "strip", z.ZodTypeAny, {
    status: "todo" | "in_progress" | "completed";
    title: string;
    projectId: string;
    description?: string | undefined;
    assignedUserIds?: string[] | undefined;
}, {
    title: string;
    projectId: string;
    status?: "todo" | "in_progress" | "completed" | undefined;
    description?: string | undefined;
    assignedUserIds?: string[] | undefined;
}>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export declare const UpdateTaskSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    projectId: z.ZodOptional<z.ZodString>;
    assignedUserIds: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["todo", "in_progress", "completed"]>>>;
}, "strip", z.ZodTypeAny, {
    status?: "todo" | "in_progress" | "completed" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    projectId?: string | undefined;
    assignedUserIds?: string[] | undefined;
}, {
    status?: "todo" | "in_progress" | "completed" | undefined;
    description?: string | undefined;
    title?: string | undefined;
    projectId?: string | undefined;
    assignedUserIds?: string[] | undefined;
}>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export declare const RegisterDeviceSchema: z.ZodObject<{
    deviceName: z.ZodString;
    os: z.ZodString;
    ipAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deviceName: string;
    os: string;
    ipAddress?: string | undefined;
}, {
    deviceName: string;
    os: string;
    ipAddress?: string | undefined;
}>;
export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;
export declare const CreatePolicySchema: z.ZodObject<{
    version: z.ZodNumber;
    screenshotIntervalMinutes: z.ZodDefault<z.ZodNumber>;
    idleTimeoutMinutes: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    isBlurEnabled: z.ZodDefault<z.ZodBoolean>;
    retentionDays: z.ZodDefault<z.ZodNumber>;
    consentText: z.ZodString;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    version: number;
    screenshotIntervalMinutes: number;
    isBlurEnabled: boolean;
    retentionDays: number;
    consentText: string;
    isActive: boolean;
    idleTimeoutMinutes?: number | undefined;
}, {
    version: number;
    consentText: string;
    screenshotIntervalMinutes?: number | undefined;
    idleTimeoutMinutes?: number | undefined;
    isBlurEnabled?: boolean | undefined;
    retentionDays?: number | undefined;
    isActive?: boolean | undefined;
}>;
export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;
export declare const AcceptConsentSchema: z.ZodObject<{
    policyVersion: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    policyVersion: number;
}, {
    policyVersion: number;
}>;
export type AcceptConsentInput = z.infer<typeof AcceptConsentSchema>;
export declare const StartTimerSchema: z.ZodObject<{
    taskId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    projectId?: string | undefined;
    taskId?: string | undefined;
}, {
    description?: string | undefined;
    projectId?: string | undefined;
    taskId?: string | undefined;
}>;
export type StartTimerInput = z.infer<typeof StartTimerSchema>;
export declare const StopTimerSchema: z.ZodObject<{
    timeEntryId: z.ZodOptional<z.ZodString>;
    durationSeconds: z.ZodOptional<z.ZodNumber>;
    breakSeconds: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeEntryId?: string | undefined;
    durationSeconds?: number | undefined;
    breakSeconds?: number | undefined;
}, {
    timeEntryId?: string | undefined;
    durationSeconds?: number | undefined;
    breakSeconds?: number | undefined;
}>;
export type StopTimerInput = z.infer<typeof StopTimerSchema>;
export declare const SyncTimeEntryItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    taskId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    start: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    end: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
    durationSeconds: z.ZodDefault<z.ZodNumber>;
    breakSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    isManualEdit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    isSync: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    durationSeconds: number;
    breakSeconds: number;
    start: string | Date;
    isManualEdit: boolean;
    isSync: boolean;
    id?: string | undefined;
    description?: string | undefined;
    projectId?: string | null | undefined;
    taskId?: string | null | undefined;
    end?: string | Date | null | undefined;
}, {
    start: string | Date;
    id?: string | undefined;
    description?: string | undefined;
    projectId?: string | null | undefined;
    taskId?: string | null | undefined;
    durationSeconds?: number | undefined;
    breakSeconds?: number | undefined;
    end?: string | Date | null | undefined;
    isManualEdit?: boolean | undefined;
    isSync?: boolean | undefined;
}>;
export type SyncTimeEntryItem = z.infer<typeof SyncTimeEntryItemSchema>;
export declare const SyncTimeEntriesSchema: z.ZodObject<{
    entries: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        taskId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        description: z.ZodOptional<z.ZodString>;
        start: z.ZodUnion<[z.ZodString, z.ZodDate]>;
        end: z.ZodNullable<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>>;
        durationSeconds: z.ZodDefault<z.ZodNumber>;
        breakSeconds: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        isManualEdit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        isSync: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        durationSeconds: number;
        breakSeconds: number;
        start: string | Date;
        isManualEdit: boolean;
        isSync: boolean;
        id?: string | undefined;
        description?: string | undefined;
        projectId?: string | null | undefined;
        taskId?: string | null | undefined;
        end?: string | Date | null | undefined;
    }, {
        start: string | Date;
        id?: string | undefined;
        description?: string | undefined;
        projectId?: string | null | undefined;
        taskId?: string | null | undefined;
        durationSeconds?: number | undefined;
        breakSeconds?: number | undefined;
        end?: string | Date | null | undefined;
        isManualEdit?: boolean | undefined;
        isSync?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        durationSeconds: number;
        breakSeconds: number;
        start: string | Date;
        isManualEdit: boolean;
        isSync: boolean;
        id?: string | undefined;
        description?: string | undefined;
        projectId?: string | null | undefined;
        taskId?: string | null | undefined;
        end?: string | Date | null | undefined;
    }[];
}, {
    entries: {
        start: string | Date;
        id?: string | undefined;
        description?: string | undefined;
        projectId?: string | null | undefined;
        taskId?: string | null | undefined;
        durationSeconds?: number | undefined;
        breakSeconds?: number | undefined;
        end?: string | Date | null | undefined;
        isManualEdit?: boolean | undefined;
        isSync?: boolean | undefined;
    }[];
}>;
export type SyncTimeEntriesInput = z.infer<typeof SyncTimeEntriesSchema>;
export declare const CreateManualEntrySchema: z.ZodObject<{
    taskId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    start: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    end: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    start: string | Date;
    end: string | Date;
    reason: string;
    projectId?: string | undefined;
    taskId?: string | undefined;
}, {
    start: string | Date;
    end: string | Date;
    reason: string;
    projectId?: string | undefined;
    taskId?: string | undefined;
}>;
export type CreateManualEntryInput = z.infer<typeof CreateManualEntrySchema>;
export declare const UpdateManualEntrySchema: z.ZodObject<{
    taskId: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
    start: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    end: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    projectId?: string | undefined;
    taskId?: string | undefined;
    start?: string | Date | undefined;
    end?: string | Date | undefined;
}, {
    reason: string;
    projectId?: string | undefined;
    taskId?: string | undefined;
    start?: string | Date | undefined;
    end?: string | Date | undefined;
}>;
export type UpdateManualEntryInput = z.infer<typeof UpdateManualEntrySchema>;
export declare const ActivitySampleSchema: z.ZodObject<{
    timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    keyboardCount: z.ZodNumber;
    mouseCount: z.ZodNumber;
    isIdle: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    activeWindowTitle: z.ZodOptional<z.ZodString>;
    isSync: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    isSync: boolean;
    timestamp: string | Date;
    keyboardCount: number;
    mouseCount: number;
    isIdle: boolean;
    activeWindowTitle?: string | undefined;
}, {
    timestamp: string | Date;
    keyboardCount: number;
    mouseCount: number;
    isSync?: boolean | undefined;
    isIdle?: boolean | undefined;
    activeWindowTitle?: string | undefined;
}>;
export declare const BatchActivitySchema: z.ZodObject<{
    deviceId: z.ZodOptional<z.ZodString>;
    samples: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>;
        keyboardCount: z.ZodNumber;
        mouseCount: z.ZodNumber;
        isIdle: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        activeWindowTitle: z.ZodOptional<z.ZodString>;
        isSync: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        isSync: boolean;
        timestamp: string | Date;
        keyboardCount: number;
        mouseCount: number;
        isIdle: boolean;
        activeWindowTitle?: string | undefined;
    }, {
        timestamp: string | Date;
        keyboardCount: number;
        mouseCount: number;
        isSync?: boolean | undefined;
        isIdle?: boolean | undefined;
        activeWindowTitle?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    samples: {
        isSync: boolean;
        timestamp: string | Date;
        keyboardCount: number;
        mouseCount: number;
        isIdle: boolean;
        activeWindowTitle?: string | undefined;
    }[];
    deviceId?: string | undefined;
}, {
    samples: {
        timestamp: string | Date;
        keyboardCount: number;
        mouseCount: number;
        isSync?: boolean | undefined;
        isIdle?: boolean | undefined;
        activeWindowTitle?: string | undefined;
    }[];
    deviceId?: string | undefined;
}>;
export type BatchActivityInput = z.infer<typeof BatchActivitySchema>;
export declare const PresignScreenshotSchema: z.ZodObject<{
    deviceId: z.ZodOptional<z.ZodString>;
    timeEntryId: z.ZodOptional<z.ZodString>;
    isBlurred: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    isBlurred: boolean;
    timeEntryId?: string | undefined;
    deviceId?: string | undefined;
}, {
    timeEntryId?: string | undefined;
    deviceId?: string | undefined;
    isBlurred?: boolean | undefined;
}>;
export type PresignScreenshotInput = z.infer<typeof PresignScreenshotSchema>;
export declare const ConfirmScreenshotSchema: z.ZodObject<{
    s3Key: z.ZodString;
    capturedAt: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    timeEntryId: z.ZodOptional<z.ZodString>;
    deviceId: z.ZodOptional<z.ZodString>;
    isBlurred: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    activityScore: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    isBlurred: boolean;
    s3Key: string;
    capturedAt: string | Date;
    activityScore: number;
    timeEntryId?: string | undefined;
    deviceId?: string | undefined;
}, {
    s3Key: string;
    capturedAt: string | Date;
    timeEntryId?: string | undefined;
    deviceId?: string | undefined;
    isBlurred?: boolean | undefined;
    activityScore?: number | undefined;
}>;
export type ConfirmScreenshotInput = z.infer<typeof ConfirmScreenshotSchema>;
export interface HelloSharedResponse {
    message: string;
    app: string;
}
export declare const getHelloShared: () => HelloSharedResponse;
//# sourceMappingURL=index.d.ts.map