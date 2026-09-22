"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSponsorSchema = exports.updateFaqSchema = exports.updateSpeakerSchema = exports.updateTestimonialSchema = exports.updateKnowledgeLineSchema = exports.updateKnowledgeAreaSchema = exports.updateProgramSchema = exports.updateAgendaItemSchema = exports.updateAgendaDaySchema = exports.paymentPolicySchema = exports.paymentSettingsSchema = exports.sponsorSchema = exports.faqSchema = exports.speakerSchema = exports.testimonialSchema = exports.agendaItemSchema = exports.agendaDaySchema = exports.knowledgeLineSchema = exports.knowledgeAreaSchema = exports.programSchema = exports.siteDataItemParamsSchema = exports.siteDataEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.siteDataEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.siteDataItemParamsSchema = exports.siteDataEventParamsSchema.extend({
    id: zod_1.z.string().uuid(),
});
const statusSchema = zod_1.z.enum(['draft', 'published']).optional();
const sortOrderSchema = zod_1.z.number().int().min(0).optional();
exports.programSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(160),
    description: zod_1.z.string().nullable().optional(),
    slug: zod_1.z.string().min(2).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: sortOrderSchema,
    fullSubmissionType: zod_1.z.enum(['file', 'video_url', 'none']).optional(),
    settings: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.knowledgeAreaSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(180),
    description: zod_1.z.string().nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: sortOrderSchema,
});
exports.knowledgeLineSchema = zod_1.z.object({
    areaId: zod_1.z.string().uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(220),
    description: zod_1.z.string().nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: sortOrderSchema,
});
exports.agendaDaySchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(120),
    dateLabel: zod_1.z.string().max(120).nullable().optional(),
    startsAt: zod_1.z.string().datetime().nullable().optional(),
    status: statusSchema,
    sortOrder: sortOrderSchema,
});
exports.agendaItemSchema = zod_1.z.object({
    dayId: zod_1.z.string().uuid().nullable().optional(),
    speakerId: zod_1.z.string().uuid().nullable().optional(),
    title: zod_1.z.string().min(1).max(220),
    description: zod_1.z.string().nullable().optional(),
    startsAt: zod_1.z.string().datetime().nullable().optional(),
    endsAt: zod_1.z.string().datetime().nullable().optional(),
    timeLabel: zod_1.z.string().max(120).nullable().optional(),
    speaker: zod_1.z.string().max(180).nullable().optional(),
    speakerRole: zod_1.z.string().max(180).nullable().optional(),
    speakerImageFileId: zod_1.z.string().uuid().nullable().optional(),
    speakerEmail: zod_1.z.string().email().max(180).nullable().optional(),
    location: zod_1.z.string().max(180).nullable().optional(),
    track: zod_1.z.string().max(180).nullable().optional(),
    actionLabel: zod_1.z.string().max(120).nullable().optional(),
    actionUrl: zod_1.z.string().url().max(500).nullable().optional(),
    imageFileId: zod_1.z.string().uuid().nullable().optional(),
    status: statusSchema,
    sortOrder: sortOrderSchema,
});
exports.testimonialSchema = zod_1.z.object({
    authorName: zod_1.z.string().min(1).max(180),
    authorRole: zod_1.z.string().max(180).nullable().optional(),
    quote: zod_1.z.string().min(1),
    imageFileId: zod_1.z.string().uuid().nullable().optional(),
    status: statusSchema,
    sortOrder: sortOrderSchema,
});
exports.speakerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(180),
    role: zod_1.z.string().max(180).nullable().optional(),
    bio: zod_1.z.string().nullable().optional(),
    imageFileId: zod_1.z.string().uuid().nullable().optional(),
    email: zod_1.z.string().email().max(180).nullable().optional(),
    phone: zod_1.z.string().max(80).nullable().optional(),
    organization: zod_1.z.string().max(180).nullable().optional(),
    websiteUrl: zod_1.z.string().url().max(500).nullable().optional(),
    socialUrl: zod_1.z.string().url().max(500).nullable().optional(),
    isFeatured: zod_1.z.boolean().optional(),
    status: statusSchema,
    sortOrder: sortOrderSchema,
});
exports.faqSchema = zod_1.z.object({
    question: zod_1.z.string().min(1).max(260),
    answer: zod_1.z.string().min(1),
    status: statusSchema,
    sortOrder: sortOrderSchema,
});
exports.sponsorSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(180),
    tier: zod_1.z.string().max(120).nullable().optional(),
    url: zod_1.z.string().url().nullable().optional(),
    logoFileId: zod_1.z.string().uuid().nullable().optional(),
    status: statusSchema,
    sortOrder: sortOrderSchema,
});
exports.paymentSettingsSchema = zod_1.z.object({
    provider: zod_1.z.enum(['stripe', 'mercadopago', 'openpay']).default('stripe'),
    mode: zod_1.z.enum(['test', 'live']).default('test'),
    isActive: zod_1.z.boolean().default(true),
    isDefault: zod_1.z.boolean().default(false),
    paymentPolicy: zod_1.z.enum(['immediate', 'after_acceptance', 'manual', 'free']).optional(),
    publicKey: zod_1.z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), zod_1.z.string().max(500).nullable().optional()),
    secretKey: zod_1.z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), zod_1.z.string().min(1).optional()),
    webhookSecret: zod_1.z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), zod_1.z.string().min(1).optional()),
    openpayPublicKey: zod_1.z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), zod_1.z.string().max(500).nullable().optional()),
    openpayApiUrl: zod_1.z.preprocess((value) => (typeof value === 'string' && value.trim() === '' ? undefined : value), zod_1.z.string().url().max(500).nullable().optional()),
});
exports.paymentPolicySchema = zod_1.z.object({
    paymentPolicy: zod_1.z.enum(['immediate', 'after_acceptance', 'manual', 'free']),
});
exports.updateAgendaDaySchema = exports.agendaDaySchema.partial();
exports.updateAgendaItemSchema = exports.agendaItemSchema.partial();
exports.updateProgramSchema = exports.programSchema.partial();
exports.updateKnowledgeAreaSchema = exports.knowledgeAreaSchema.partial();
exports.updateKnowledgeLineSchema = exports.knowledgeLineSchema.partial();
exports.updateTestimonialSchema = exports.testimonialSchema.partial();
exports.updateSpeakerSchema = exports.speakerSchema.partial();
exports.updateFaqSchema = exports.faqSchema.partial();
exports.updateSponsorSchema = exports.sponsorSchema.partial();
//# sourceMappingURL=site-data.schemas.js.map