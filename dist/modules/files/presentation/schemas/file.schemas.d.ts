import { z } from 'zod';
export declare const uploadFileSchema: z.ZodObject<{
    category: z.ZodDefault<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
    eventId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const fileIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const listFilesQuerySchema: z.ZodObject<{
    eventId: z.ZodOptional<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
    mimePrefix: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
