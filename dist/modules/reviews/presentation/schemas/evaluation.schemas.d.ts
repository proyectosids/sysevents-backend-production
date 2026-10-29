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
    dueAt: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export declare const evaluationAssignmentParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const evaluatorInvitationParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    invitationId: z.ZodString;
}, z.core.$strip>;
export declare const submitEvaluationSchema: z.ZodObject<{
    answers: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    comments: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
