import { z } from 'zod';
export declare const eventIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const publicEventParamsSchema: z.ZodObject<{
    slug: z.ZodString;
}, z.core.$strip>;
export declare const createEventSchema: z.ZodObject<{
    tenantId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startsAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    endsAt: z.ZodOptional<z.ZodCoercedDate<unknown>>;
    mainModality: z.ZodOptional<z.ZodString>;
    templateEventId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateEventSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodCoercedDate<unknown>>>;
    mainModality: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    logoFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
