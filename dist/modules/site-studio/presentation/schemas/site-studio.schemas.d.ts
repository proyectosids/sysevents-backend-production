import { z } from 'zod';
export declare const siteEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const themeParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    themeId: z.ZodString;
}, z.core.$strip>;
export declare const pluginParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    pluginId: z.ZodString;
}, z.core.$strip>;
export declare const updateSiteSettingsSchema: z.ZodObject<{
    siteTitle: z.ZodOptional<z.ZodString>;
    themeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    globalStyles: z.ZodOptional<z.ZodUnknown>;
    customCss: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
}, z.core.$strip>;
