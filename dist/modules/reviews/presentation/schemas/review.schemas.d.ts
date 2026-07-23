import { z } from 'zod';
export declare const reviewTeamEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const reviewTeamProgramParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    programId: z.ZodString;
}, z.core.$strip>;
export declare const saveProgramReviewTeamSchema: z.ZodObject<{
    leaderUserId: z.ZodString;
    reviewerUserIds: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const reviewSubmissionParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const reviewIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const assignReviewerSchema: z.ZodObject<{
    reviewerUserId: z.ZodString;
    rubricId: z.ZodOptional<z.ZodString>;
    dueAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
}, z.core.$strip>;
export declare const submitReviewSchema: z.ZodObject<{
    recommendation: z.ZodEnum<{
        changes_requested: "changes_requested";
        accept: "accept";
        reject: "reject";
    }>;
    comments: z.ZodOptional<z.ZodString>;
    score: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const reviewFileParamsSchema: z.ZodObject<{
    id: z.ZodString;
    fileId: z.ZodString;
}, z.core.$strip>;
export declare const reviewFileCommentParamsSchema: z.ZodObject<{
    id: z.ZodString;
    commentId: z.ZodString;
}, z.core.$strip>;
export declare const createReviewFileCommentSchema: z.ZodObject<{
    fileId: z.ZodString;
    pageNumber: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sectionLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    selectedText: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    anchor: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>>;
    comment: z.ZodString;
}, z.core.$strip>;
export declare const updateReviewFileCommentSchema: z.ZodObject<{
    comment: z.ZodString;
}, z.core.$strip>;
export declare const finalDecisionSchema: z.ZodObject<{
    decision: z.ZodEnum<{
        changes_requested: "changes_requested";
        accepted: "accepted";
        rejected: "rejected";
        accepted_with_observations: "accepted_with_observations";
        requires_corrections: "requires_corrections";
    }>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
