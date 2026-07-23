import { z } from 'zod';
export declare const submissionEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const submissionIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const submissionTypeParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    typeId: z.ZodString;
}, z.core.$strip>;
export declare const createSubmissionTypeSchema: z.ZodObject<{
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    requiresFile: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const createSubmissionSchema: z.ZodObject<{
    submissionTypeId: z.ZodString;
    registrationId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    knowledgeAreaId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    knowledgeLineId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    abstract: z.ZodOptional<z.ZodString>;
    videoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    keywords: z.ZodOptional<z.ZodString>;
    authors: z.ZodArray<z.ZodObject<{
        fullName: z.ZodString;
        email: z.ZodString;
        affiliation: z.ZodOptional<z.ZodString>;
        isCorresponding: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const updateSubmissionSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    knowledgeAreaId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    knowledgeLineId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    abstract: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    videoUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    keywords: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const attachSubmissionFileSchema: z.ZodObject<{
    fileId: z.ZodString;
    fileRole: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
