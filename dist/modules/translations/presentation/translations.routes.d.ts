import { z } from 'zod';
export declare const translateSchema: z.ZodObject<{
    targetLanguage: z.ZodEnum<{
        en: "en";
        fr: "fr";
        pt: "pt";
        de: "de";
        it: "it";
    }>;
    texts: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const restoreSchema: z.ZodObject<{
    sourceLanguage: z.ZodEnum<{
        en: "en";
        fr: "fr";
        pt: "pt";
        de: "de";
        it: "it";
    }>;
    texts: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const translationsRouter: import("express-serve-static-core").Router;
