"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractPlanSchema = exports.updatePlanSchema = exports.createPlanSchema = exports.planIdParamsSchema = exports.onboardingSchema = void 0;
const zod_1 = require("zod");
exports.onboardingSchema = zod_1.z.object({
    planId: zod_1.z.string().uuid(),
    account: zod_1.z.object({
        firstName: zod_1.z.string().min(1).max(120),
        lastName: zod_1.z.string().min(1).max(120),
        email: zod_1.z.string().email().max(255),
        password: zod_1.z.string().min(8).max(100),
    }),
    organization: zod_1.z.object({
        name: zod_1.z.string().min(2).max(180),
        slug: zod_1.z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    }),
});
exports.planIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.createPlanSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: zod_1.z.string().min(2).max(140),
    description: zod_1.z.string().max(500).optional().nullable(),
    priceCents: zod_1.z.coerce.number().int().min(0).default(0),
    currency: zod_1.z.string().min(3).max(3).default('MXN'),
    billingInterval: zod_1.z.enum(['one_time', 'monthly', 'yearly']).default('one_time'),
    maxEvents: zod_1.z.coerce.number().int().min(1).default(1),
    maxUsers: zod_1.z.coerce.number().int().min(1).default(3),
    maxStorageMb: zod_1.z.coerce.number().int().min(1).default(500),
    features: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    isActive: zod_1.z.coerce.boolean().default(true),
    sortOrder: zod_1.z.coerce.number().int().min(0).default(0),
});
exports.updatePlanSchema = exports.createPlanSchema.partial();
exports.contractPlanSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    planId: zod_1.z.string().uuid(),
});
//# sourceMappingURL=saas.schemas.js.map