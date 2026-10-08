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
    createdAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string;
    role: "admin" | "manager" | "employee";
    createdAt: Date;
}, {
    id: string;
    email: string;
    name: string;
    role: "admin" | "manager" | "employee";
    createdAt: Date;
}>;
export type User = z.infer<typeof UserSchema>;
export interface HelloSharedResponse {
    message: string;
    app: string;
}
export declare const getHelloShared: () => HelloSharedResponse;
//# sourceMappingURL=index.d.ts.map