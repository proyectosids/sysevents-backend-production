import { z } from 'zod';
export declare const evaluatorInvitationSchema: z.ZodObject<{
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodString;
}, z.core.$strip>;
export declare const acceptEvaluatorInvitationSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export declare const evaluatorAssignmentSchema: z.ZodObject<{
    submissionId: z.ZodString;
    evaluatorUserId: z.ZodString;
    evaluationFormId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    assessmentFormatVersionId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dueAt: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export declare const bulkEvaluatorAssignmentSchema: z.ZodObject<{
    submissionIds: z.ZodArray<z.ZodString>;
    evaluatorUserId: z.ZodString;
    assessmentFormatVersionId: z.ZodString;
    dueAt: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export declare const evaluationAssignmentParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const evaluationReturnSchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strip>;
export declare const evaluationReleaseSchema: z.ZodObject<{
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const evaluatorInvitationParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    invitationId: z.ZodString;
}, z.core.$strip>;
export declare const evaluatorScopeParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const evaluatorScopeQuerySchema: z.ZodObject<{
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const submitEvaluationSchema: z.ZodObject<{
    answers: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    comments: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
