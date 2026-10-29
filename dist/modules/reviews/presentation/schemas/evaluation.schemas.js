"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitEvaluationSchema = exports.evaluatorInvitationParamsSchema = exports.evaluationAssignmentParamsSchema = exports.evaluatorAssignmentSchema = exports.acceptEvaluatorInvitationSchema = exports.evaluatorInvitationSchema = void 0;
const zod_1 = require("zod");
exports.evaluatorInvitationSchema = zod_1.z.object({
    programId: zod_1.z.string().uuid().nullable().optional(),
    email: zod_1.z.string().trim().email().max(255),
});
exports.acceptEvaluatorInvitationSchema = zod_1.z.object({
    token: zod_1.z.string().min(40).max(200),
});
exports.evaluatorAssignmentSchema = zod_1.z.object({
    submissionId: zod_1.z.string().uuid(),
    evaluatorUserId: zod_1.z.string().uuid(),
    evaluationFormId: zod_1.z.string().uuid().nullable().optional(),
    assessmentFormatVersionId: zod_1.z.string().uuid().nullable().optional(),
    dueAt: zod_1.z.coerce.date().nullable().optional(),
});
exports.evaluationAssignmentParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.evaluatorInvitationParamsSchema = zod_1.z.object({ eventId: zod_1.z.string().uuid(), invitationId: zod_1.z.string().uuid() });
exports.submitEvaluationSchema = zod_1.z.object({
    answers: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    comments: zod_1.z.string().trim().max(10000).nullable().optional(),
});
//# sourceMappingURL=evaluation.schemas.js.map