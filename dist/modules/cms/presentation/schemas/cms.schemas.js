"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSectionSchema = exports.createSectionSchema = exports.updatePageSchema = exports.createPageSchema = exports.sectionParamsSchema = exports.pageParamsSchema = exports.cmsEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.cmsEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.pageParamsSchema = exports.cmsEventParamsSchema.extend({
    pageId: zod_1.z.string().uuid(),
});
exports.sectionParamsSchema = exports.cmsEventParamsSchema.extend({
    sectionId: zod_1.z.string().uuid(),
});
exports.createPageSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(180),
    slug: zod_1.z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    status: zod_1.z.enum(['draft', 'published']).optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updatePageSchema = exports.createPageSchema.partial();
exports.createSectionSchema = zod_1.z.object({
    pageId: zod_1.z.string().uuid().optional(),
    sectionType: zod_1.z.string().min(2).max(80),
    title: zod_1.z.string().max(180).optional(),
    content: zod_1.z.unknown().optional(),
    status: zod_1.z.enum(['draft', 'published']).optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updateSectionSchema = zod_1.z.object({
    pageId: zod_1.z.string().uuid().nullable().optional(),
    sectionType: zod_1.z.string().min(2).max(80).optional(),
    title: zod_1.z.string().max(180).nullable().optional(),
    content: zod_1.z.unknown().optional(),
    status: zod_1.z.enum(['draft', 'published']).optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
//# sourceMappingURL=cms.schemas.js.map