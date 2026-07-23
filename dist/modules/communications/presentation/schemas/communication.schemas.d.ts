import { z } from 'zod';
export declare const emailTemplateParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const updateEmailTemplateSchema: z.ZodObject<{
    subject: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
