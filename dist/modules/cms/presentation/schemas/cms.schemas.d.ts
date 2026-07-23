import { z } from 'zod';
export declare const cmsEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const pageParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    pageId: z.ZodString;
}, z.core.$strip>;
export declare const sectionParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    sectionId: z.ZodString;
}, z.core.$strip>;
export declare const createPageSchema: z.ZodObject<{
    title: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updatePageSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createSectionSchema: z.ZodObject<{
    pageId: z.ZodOptional<z.ZodString>;
    sectionType: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodUnknown>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateSectionSchema: z.ZodObject<{
    pageId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    sectionType: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    content: z.ZodOptional<z.ZodUnknown>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
