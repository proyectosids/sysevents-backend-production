"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.acceptTenantInvitationSchema = exports.invitationTokenParamsSchema = exports.updateTenantUserProfileSchema = exports.updateTenantUserSchema = exports.tenantUserParamsSchema = exports.addTenantUserSchema = exports.updateTenantSchema = exports.createTenantSchema = exports.tenantIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.tenantIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.createTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(180),
    slug: zod_1.z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
exports.updateTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(180).optional(),
    slug: zod_1.z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    status: zod_1.z.enum(['active', 'inactive']).optional(),
});
exports.addTenantUserSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional(),
    email: zod_1.z.string().email().optional(),
    firstName: zod_1.z.string().min(2).max(120).optional(),
    lastName: zod_1.z.string().min(2).max(120).optional(),
    tenantRole: zod_1.z.enum(['owner', 'admin', 'member', 'reviewer']).default('member'),
}).refine((value) => value.userId || value.email, {
    message: 'userId or email is required',
});
exports.tenantUserParamsSchema = exports.tenantIdParamsSchema.extend({
    userId: zod_1.z.string().uuid(),
});
exports.updateTenantUserSchema = zod_1.z.object({
    tenantRole: zod_1.z.enum(['owner', 'admin', 'member', 'reviewer']),
});
exports.updateTenantUserProfileSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(255),
    firstName: zod_1.z.string().min(1).max(120),
    lastName: zod_1.z.string().min(1).max(120),
});
exports.invitationTokenParamsSchema = zod_1.z.object({
    token: zod_1.z.string().min(32).max(256),
});
exports.acceptTenantInvitationSchema = zod_1.z.object({
    password: zod_1.z.string().min(8).max(100),
});
//# sourceMappingURL=tenant.schemas.js.map