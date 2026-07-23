"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFilesQuerySchema = exports.fileIdParamsSchema = exports.uploadFileSchema = void 0;
const zod_1 = require("zod");
exports.uploadFileSchema = zod_1.z.object({
    category: zod_1.z.string().min(2).max(100).default('submission_document'),
    tenantId: zod_1.z.string().uuid().optional(),
    eventId: zod_1.z.string().uuid().optional(),
});
exports.fileIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.listFilesQuerySchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string().uuid().optional(),
    mimePrefix: zod_1.z.string().max(80).optional(),
});
//# sourceMappingURL=file.schemas.js.map