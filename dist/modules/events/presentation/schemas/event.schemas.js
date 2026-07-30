"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventSchema = exports.createEventSchema = exports.publicEventParamsSchema = exports.eventIdParamsSchema = void 0;
const zod_1 = require("zod");
const optionalUuidSchema = zod_1.z.preprocess((value) => value === '' ? undefined : value, zod_1.z.string().uuid().optional());
exports.eventIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
});
exports.publicEventParamsSchema = zod_1.z.object({
    slug: zod_1.z.string().min(2).max(140),
});
exports.createEventSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2).max(200),
    slug: zod_1.z.string().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    description: zod_1.z.string().optional(),
    startsAt: zod_1.z.coerce.date().optional(),
    endsAt: zod_1.z.coerce.date().optional(),
    mainModality: zod_1.z.string().max(80).optional(),
    templateEventId: optionalUuidSchema,
});
exports.updateEventSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(200).optional(),
    slug: zod_1.z.string().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    description: zod_1.z.string().nullable().optional(),
    startsAt: zod_1.z.coerce.date().nullable().optional(),
    endsAt: zod_1.z.coerce.date().nullable().optional(),
    mainModality: zod_1.z.string().max(80).nullable().optional(),
    logoFileId: zod_1.z.string().uuid().nullable().optional(),
});
//# sourceMappingURL=event.schemas.js.map