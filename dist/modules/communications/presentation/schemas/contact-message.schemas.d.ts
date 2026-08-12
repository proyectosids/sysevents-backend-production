import { z } from 'zod';
export declare const contactEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const contactMessageParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strip>;
export declare const createContactMessageSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    subject: z.ZodString;
    message: z.ZodString;
    website: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const listContactMessagesQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        archived: "archived";
        new: "new";
        read: "read";
    }>>;
}, z.core.$strip>;
export declare const updateContactMessageSchema: z.ZodObject<{
    status: z.ZodEnum<{
        archived: "archived";
        new: "new";
        read: "read";
    }>;
}, z.core.$strip>;
