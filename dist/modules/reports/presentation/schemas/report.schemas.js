"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveReportDefinitionSchema = exports.dynamicReportQuerySchema = exports.dynamicReportConfigSchema = exports.reportDimensionSchema = exports.reportDefinitionParamsSchema = exports.reportEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.reportEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.reportDefinitionParamsSchema = exports.reportEventParamsSchema.extend({
    definitionId: zod_1.z.string().uuid(),
});
exports.reportDimensionSchema = zod_1.z.enum([
    'program',
    'knowledgeArea',
    'knowledgeLine',
    'registrationType',
    'registrationStatus',
    'participationMode',
    'institution',
    'country',
    'submissionType',
    'submissionStatus',
]);
exports.dynamicReportConfigSchema = zod_1.z.object({
    groupBy: zod_1.z.array(exports.reportDimensionSchema).min(1).max(2),
    filters: zod_1.z.partialRecord(exports.reportDimensionSchema, zod_1.z.array(zod_1.z.string().trim().min(1)).max(50)).default({}),
});
exports.dynamicReportQuerySchema = exports.dynamicReportConfigSchema.extend({
    includeDetails: zod_1.z.boolean().default(false),
});
exports.saveReportDefinitionSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(160),
    config: exports.dynamicReportConfigSchema,
});
//# sourceMappingURL=report.schemas.js.map