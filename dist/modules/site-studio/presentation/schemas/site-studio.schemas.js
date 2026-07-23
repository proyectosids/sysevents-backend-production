"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSiteSettingsSchema = exports.pluginParamsSchema = exports.themeParamsSchema = exports.siteEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.siteEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.themeParamsSchema = exports.siteEventParamsSchema.extend({
    themeId: zod_1.z.string().uuid(),
});
exports.pluginParamsSchema = exports.siteEventParamsSchema.extend({
    pluginId: zod_1.z.string().uuid(),
});
exports.updateSiteSettingsSchema = zod_1.z.object({
    siteTitle: zod_1.z.string().min(1).max(180).optional(),
    themeId: zod_1.z.string().uuid().nullable().optional(),
    globalStyles: zod_1.z.unknown().optional(),
    customCss: zod_1.z.string().max(20000).nullable().optional(),
    status: zod_1.z.enum(['draft', 'published']).optional(),
});
//# sourceMappingURL=site-studio.schemas.js.map