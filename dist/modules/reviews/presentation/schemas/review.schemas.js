"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalDecisionSchema = exports.updateReviewFileCommentSchema = exports.createReviewFileCommentSchema = exports.reviewFileCommentParamsSchema = exports.reviewFileParamsSchema = exports.submitReviewSchema = exports.assignReviewerSchema = exports.reviewIdParamsSchema = exports.reviewSubmissionParamsSchema = exports.saveProgramReviewTeamSchema = exports.reviewTeamProgramParamsSchema = exports.reviewTeamEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.reviewTeamEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.reviewTeamProgramParamsSchema = exports.reviewTeamEventParamsSchema.extend({
    programId: zod_1.z.string().uuid(),
});
exports.saveProgramReviewTeamSchema = zod_1.z.object({
    leaderUserId: zod_1.z.string().uuid(),
    reviewerUserIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
exports.reviewSubmissionParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.reviewIdParamsSchema = zod_1.z.object({ id: zod_1.z.string().uuid() });
exports.assignReviewerSchema = zod_1.z.object({
    reviewerUserId: zod_1.z.string().uuid(),
    rubricId: zod_1.z.string().uuid().optional(),
    dueAt: zod_1.z.coerce.date().optional(),
});
exports.submitReviewSchema = zod_1.z.object({
    recommendation: zod_1.z.enum(['accept', 'reject', 'changes_requested']),
    comments: zod_1.z.string().optional(),
    score: zod_1.z.number().min(0).optional(),
});
exports.reviewFileParamsSchema = exports.reviewIdParamsSchema.extend({ fileId: zod_1.z.string().uuid() });
exports.reviewFileCommentParamsSchema = exports.reviewIdParamsSchema.extend({ commentId: zod_1.z.string().uuid() });
exports.createReviewFileCommentSchema = zod_1.z.object({
    fileId: zod_1.z.string().uuid(),
    pageNumber: zod_1.z.number().int().positive().nullable().optional(),
    sectionLabel: zod_1.z.string().max(180).nullable().optional(),
    selectedText: zod_1.z.string().min(1).max(2000).nullable().optional(),
    anchor: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()])).nullable().optional(),
    comment: zod_1.z.string().min(2).max(5000),
});
exports.updateReviewFileCommentSchema = zod_1.z.object({
    comment: zod_1.z.string().min(2).max(5000),
});
exports.finalDecisionSchema = zod_1.z.object({
    decision: zod_1.z.enum(['accepted', 'accepted_with_observations', 'requires_corrections', 'rejected', 'changes_requested']),
    notes: zod_1.z.string().optional(),
});
//# sourceMappingURL=review.schemas.js.map