"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPermissionSchema = exports.assignPermissionsSchema = exports.updateRoleSchema = exports.createRoleSchema = exports.updateUserSchema = exports.idParamsSchema = void 0;
const zod_1 = require("zod");
exports.idParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(255).optional(),
    firstName: zod_1.z.string().min(1).max(120).optional(),
    lastName: zod_1.z.string().min(1).max(120).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().max(255).optional(),
});
exports.updateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    description: zod_1.z.string().max(255).nullable().optional(),
});
exports.assignPermissionsSchema = zod_1.z.object({
    permissionIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
exports.createPermissionSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(150),
    description: zod_1.z.string().max(255).optional(),
});
//# sourceMappingURL=iam.schemas.js.map