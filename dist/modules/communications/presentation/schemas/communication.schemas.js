"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmailTemplateSchema = exports.emailTemplateParamsSchema = void 0;
const zod_1 = require("zod");
exports.emailTemplateParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.updateEmailTemplateSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1).max(255).optional(),
    body: zod_1.z.string().min(1).optional(),
    isActive: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=communication.schemas.js.map