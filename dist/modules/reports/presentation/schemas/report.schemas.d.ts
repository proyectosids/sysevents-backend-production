import { z } from 'zod';
export declare const reportEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const reportDefinitionParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    definitionId: z.ZodString;
}, z.core.$strip>;
export declare const reportDimensionSchema: z.ZodEnum<{
    institution: "institution";
    country: "country";
    participationMode: "participationMode";
    program: "program";
    knowledgeArea: "knowledgeArea";
    knowledgeLine: "knowledgeLine";
    registrationType: "registrationType";
    registrationStatus: "registrationStatus";
    submissionType: "submissionType";
    submissionStatus: "submissionStatus";
}>;
export declare const dynamicReportConfigSchema: z.ZodObject<{
    groupBy: z.ZodArray<z.ZodEnum<{
        institution: "institution";
        country: "country";
        participationMode: "participationMode";
        program: "program";
        knowledgeArea: "knowledgeArea";
        knowledgeLine: "knowledgeLine";
        registrationType: "registrationType";
        registrationStatus: "registrationStatus";
        submissionType: "submissionType";
        submissionStatus: "submissionStatus";
    }>>;
    filters: z.ZodDefault<z.ZodRecord<z.ZodEnum<{
        institution: "institution";
        country: "country";
        participationMode: "participationMode";
        program: "program";
        knowledgeArea: "knowledgeArea";
        knowledgeLine: "knowledgeLine";
        registrationType: "registrationType";
        registrationStatus: "registrationStatus";
        submissionType: "submissionType";
        submissionStatus: "submissionStatus";
    }> & z.core.$partial, z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export declare const dynamicReportQuerySchema: z.ZodObject<{
    groupBy: z.ZodArray<z.ZodEnum<{
        institution: "institution";
        country: "country";
        participationMode: "participationMode";
        program: "program";
        knowledgeArea: "knowledgeArea";
        knowledgeLine: "knowledgeLine";
        registrationType: "registrationType";
        registrationStatus: "registrationStatus";
        submissionType: "submissionType";
        submissionStatus: "submissionStatus";
    }>>;
    filters: z.ZodDefault<z.ZodRecord<z.ZodEnum<{
        institution: "institution";
        country: "country";
        participationMode: "participationMode";
        program: "program";
        knowledgeArea: "knowledgeArea";
        knowledgeLine: "knowledgeLine";
        registrationType: "registrationType";
        registrationStatus: "registrationStatus";
        submissionType: "submissionType";
        submissionStatus: "submissionStatus";
    }> & z.core.$partial, z.ZodArray<z.ZodString>>>;
    includeDetails: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export declare const saveReportDefinitionSchema: z.ZodObject<{
    name: z.ZodString;
    config: z.ZodObject<{
        groupBy: z.ZodArray<z.ZodEnum<{
            institution: "institution";
            country: "country";
            participationMode: "participationMode";
            program: "program";
            knowledgeArea: "knowledgeArea";
            knowledgeLine: "knowledgeLine";
            registrationType: "registrationType";
            registrationStatus: "registrationStatus";
            submissionType: "submissionType";
            submissionStatus: "submissionStatus";
        }>>;
        filters: z.ZodDefault<z.ZodRecord<z.ZodEnum<{
            institution: "institution";
            country: "country";
            participationMode: "participationMode";
            program: "program";
            knowledgeArea: "knowledgeArea";
            knowledgeLine: "knowledgeLine";
            registrationType: "registrationType";
            registrationStatus: "registrationStatus";
            submissionType: "submissionType";
            submissionStatus: "submissionStatus";
        }> & z.core.$partial, z.ZodArray<z.ZodString>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
