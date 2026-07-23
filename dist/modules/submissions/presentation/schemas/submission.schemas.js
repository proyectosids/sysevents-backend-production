"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSubmissionFileSchema = exports.updateSubmissionSchema = exports.createSubmissionSchema = exports.createSubmissionTypeSchema = exports.submissionTypeParamsSchema = exports.submissionIdParamsSchema = exports.submissionEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.submissionEventParamsSchema = zod_1.z.object({ eventId: zod_1.z.string().uuid() });
exports.submissionIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.submissionTypeParamsSchema = exports.submissionEventParamsSchema.extend({ typeId: zod_1.z.string().uuid() });
exports.createSubmissionTypeSchema = zod_1.z.object({
    programId: zod_1.z.string().uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(120),
    description: zod_1.z.string().max(255).optional(),
    requiresFile: zod_1.z.boolean().optional(),
});
exports.createSubmissionSchema = zod_1.z.object({
    submissionTypeId: zod_1.z.string().uuid(),
    registrationId: zod_1.z.string().uuid().nullable().optional(),
    knowledgeAreaId: zod_1.z.string().uuid().nullable().optional(),
    knowledgeLineId: zod_1.z.string().uuid().nullable().optional(),
    title: zod_1.z.string().min(3).max(250),
    abstract: zod_1.z.string().min(10).optional(),
    videoUrl: zod_1.z.string().url().max(1000).nullable().optional(),
    keywords: zod_1.z.string().max(500).optional(),
    authors: zod_1.z.array(zod_1.z.object({
        fullName: zod_1.z.string().min(2).max(180),
        email: zod_1.z.string().email(),
        affiliation: zod_1.z.string().max(180).optional(),
        isCorresponding: zod_1.z.boolean().optional(),
    })).min(1),
});
exports.updateSubmissionSchema = zod_1.z.object({
    title: zod_1.z.string().min(3).max(250).optional(),
    knowledgeAreaId: zod_1.z.string().uuid().nullable().optional(),
    knowledgeLineId: zod_1.z.string().uuid().nullable().optional(),
    abstract: zod_1.z.string().min(10).nullable().optional(),
    videoUrl: zod_1.z.string().url().max(1000).nullable().optional(),
    keywords: zod_1.z.string().max(500).nullable().optional(),
});
exports.attachSubmissionFileSchema = zod_1.z.object({
    fileId: zod_1.z.string().uuid(),
    fileRole: zod_1.z.string().min(2).max(60).default('manuscript'),
});
//# sourceMappingURL=submission.schemas.js.map