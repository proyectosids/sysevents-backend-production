"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContactMessageSchema = exports.listContactMessagesQuerySchema = exports.createContactMessageSchema = exports.contactMessageParamsSchema = exports.contactEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.contactEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.contactMessageParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    messageId: zod_1.z.string().uuid(),
});
exports.createContactMessageSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(160),
    email: zod_1.z.string().trim().email().max(255),
    subject: zod_1.z.string().trim().min(2).max(255),
    message: zod_1.z.string().trim().min(10).max(5000),
    website: zod_1.z.string().max(0).optional(),
});
exports.listContactMessagesQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['new', 'read', 'archived']).optional(),
});
exports.updateContactMessageSchema = zod_1.z.object({
    status: zod_1.z.enum(['new', 'read', 'archived']),
});
//# sourceMappingURL=contact-message.schemas.js.map