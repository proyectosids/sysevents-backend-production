import { z } from 'zod';
export declare const siteDataEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const siteDataItemParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>;
export declare const programSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    slug: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    fullSubmissionType: z.ZodOptional<z.ZodEnum<{
        video_url: "video_url";
        none: "none";
        file: "file";
    }>>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const knowledgeAreaSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const knowledgeLineSchema: z.ZodObject<{
    areaId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const agendaDaySchema: z.ZodObject<{
    label: z.ZodString;
    dateLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const agendaItemSchema: z.ZodObject<{
    dayId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    speakerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    startsAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endsAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timeLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    speaker: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    speakerRole: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    speakerImageFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    speakerEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    track: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    actionLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    actionUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    imageFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const testimonialSchema: z.ZodObject<{
    authorName: z.ZodString;
    authorRole: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    quote: z.ZodString;
    imageFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const speakerSchema: z.ZodObject<{
    name: z.ZodString;
    role: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    bio: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    imageFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    organization: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    websiteUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    socialUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const faqSchema: z.ZodObject<{
    question: z.ZodString;
    answer: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const sponsorSchema: z.ZodObject<{
    name: z.ZodString;
    tier: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    logoFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const paymentSettingsSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<{
        stripe: "stripe";
        mercadopago: "mercadopago";
        openpay: "openpay";
    }>>;
    mode: z.ZodDefault<z.ZodEnum<{
        test: "test";
        live: "live";
    }>>;
    isActive: z.ZodDefault<z.ZodBoolean>;
    isDefault: z.ZodDefault<z.ZodBoolean>;
    paymentPolicy: z.ZodOptional<z.ZodEnum<{
        immediate: "immediate";
        free: "free";
        after_acceptance: "after_acceptance";
        manual: "manual";
    }>>;
    publicKey: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    secretKey: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    webhookSecret: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    openpayPublicKey: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    openpayApiUrl: z.ZodPreprocess<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$strip>;
export declare const updateAgendaDaySchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    dateLabel: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    startsAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateAgendaItemSchema: z.ZodObject<{
    dayId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    speakerId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    startsAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    endsAt: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    timeLabel: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    speaker: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    speakerRole: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    speakerImageFileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    speakerEmail: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    location: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    track: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    actionLabel: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    actionUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    imageFileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateProgramSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    slug: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    fullSubmissionType: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        video_url: "video_url";
        none: "none";
        file: "file";
    }>>>;
    settings: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>;
export declare const updateKnowledgeAreaSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateKnowledgeLineSchema: z.ZodObject<{
    areaId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateTestimonialSchema: z.ZodObject<{
    authorName: z.ZodOptional<z.ZodString>;
    authorRole: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    quote: z.ZodOptional<z.ZodString>;
    imageFileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateSpeakerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    bio: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    imageFileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    email: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    organization: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    websiteUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    socialUrl: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateFaqSchema: z.ZodObject<{
    question: z.ZodOptional<z.ZodString>;
    answer: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const updateSponsorSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    tier: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    url: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    logoFileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
