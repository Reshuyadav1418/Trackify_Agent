"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHelloShared = exports.UserSchema = exports.DEFAULT_SCREENSHOT_BUCKET = exports.APP_NAME = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
// Roles
exports.UserRoleSchema = zod_1.z.enum(['admin', 'manager', 'employee']);
// App Constants
exports.APP_NAME = 'TeamLogger';
exports.DEFAULT_SCREENSHOT_BUCKET = 'screenshots';
// Sample Zod Schemas & Types for Data Models specified in SPEC.md
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    role: exports.UserRoleSchema,
    createdAt: zod_1.z.date(),
});
const getHelloShared = () => ({
    message: 'Hello from @teamlogger/shared package!',
    app: exports.APP_NAME,
});
exports.getHelloShared = getHelloShared;
//# sourceMappingURL=index.js.map