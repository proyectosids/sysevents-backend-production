"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRegistrationStatusSchema = exports.updateTeamCertificateSettingsSchema = exports.issueCertificateSchema = exports.updateCertificateTemplateSchema = exports.createCertificateTemplateSchema = exports.updateEventMaterialSchema = exports.createEventMaterialSchema = exports.updateRegistrationFormFieldSchema = exports.createRegistrationFormFieldSchema = exports.updateRegistrationFormSchema = exports.createRegistrationFormSchema = exports.updateMyRegistrationSchema = exports.createParticipantEnrollmentSchema = exports.createRegistrationSchema = exports.updateRegistrationAddonSchema = exports.createRegistrationAddonSchema = exports.updateRegistrationTypeSchema = exports.createRegistrationTypeSchema = exports.certificateTemplateParamsSchema = exports.eventMaterialParamsSchema = exports.registrationAddonParamsSchema = exports.registrationFormFieldParamsSchema = exports.registrationFormParamsSchema = exports.registrationParamsSchema = exports.registrationEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.registrationEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.registrationParamsSchema = exports.registrationEventParamsSchema.extend({
    id: zod_1.z.string().uuid(),
});
exports.registrationFormParamsSchema = exports.registrationEventParamsSchema.extend({
    formId: zod_1.z.string().uuid(),
});
exports.registrationFormFieldParamsSchema = exports.registrationFormParamsSchema.extend({
    fieldId: zod_1.z.string().uuid(),
});
exports.registrationAddonParamsSchema = exports.registrationEventParamsSchema.extend({
    addonId: zod_1.z.string().uuid(),
});
exports.eventMaterialParamsSchema = exports.registrationEventParamsSchema.extend({
    materialId: zod_1.z.string().uuid(),
});
exports.certificateTemplateParamsSchema = exports.registrationEventParamsSchema.extend({
    templateId: zod_1.z.string().uuid(),
});
exports.createRegistrationTypeSchema = zod_1.z.object({
    programId: zod_1.z.string().uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(120),
    description: zod_1.z.string().max(255).optional(),
    priceCents: zod_1.z.number().int().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    capacity: zod_1.z.number().int().positive().nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updateRegistrationTypeSchema = exports.createRegistrationTypeSchema.partial();
exports.createRegistrationAddonSchema = zod_1.z.object({
    registrationTypeId: zod_1.z.string().uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(140),
    description: zod_1.z.string().max(500).optional(),
    category: zod_1.z.string().min(2).max(80).default('general'),
    priceCents: zod_1.z.number().int().min(0).optional(),
    currency: zod_1.z.string().length(3).optional(),
    capacity: zod_1.z.number().int().positive().nullable().optional(),
    isRequired: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateRegistrationAddonSchema = exports.createRegistrationAddonSchema.partial();
exports.createRegistrationSchema = zod_1.z.object({
    registrationTypeId: zod_1.z.string().uuid(),
    programId: zod_1.z.string().uuid().nullable().optional(),
    formId: zod_1.z.string().uuid().optional(),
    formAnswers: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    addonSelections: zod_1.z.array(zod_1.z.object({
        addonId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().positive().max(20).default(1),
    })).optional(),
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().min(1).max(120),
    lastName: zod_1.z.string().min(1).max(120),
    phone: zod_1.z.string().max(40).optional(),
    institution: zod_1.z.string().max(180).optional(),
    country: zod_1.z.string().max(100).optional(),
    metadata: zod_1.z.unknown().optional(),
    deferForm: zod_1.z.boolean().optional(),
});
exports.createParticipantEnrollmentSchema = zod_1.z.object({
    registrationTypeId: zod_1.z.string().uuid().optional(),
    programId: zod_1.z.string().uuid().nullable().optional(),
    addonSelections: zod_1.z.array(zod_1.z.object({
        addonId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().positive().max(20).default(1),
    })).optional(),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(200),
    firstName: zod_1.z.string().min(1).max(120),
    lastName: zod_1.z.string().min(1).max(120),
});
exports.updateMyRegistrationSchema = zod_1.z.object({
    formId: zod_1.z.string().uuid().optional(),
    formAnswers: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    phone: zod_1.z.string().max(40).nullable().optional(),
    institution: zod_1.z.string().max(180).nullable().optional(),
    country: zod_1.z.string().max(100).nullable().optional(),
    knowledgeAreaId: zod_1.z.string().uuid().nullable().optional(),
    knowledgeLineId: zod_1.z.string().uuid().nullable().optional(),
    professionalExperience: zod_1.z.array(zod_1.z.object({
        startYear: zod_1.z.number().int().min(1900).max(2200),
        endYear: zod_1.z.number().int().min(1900).max(2200).nullable(),
        isCurrent: zod_1.z.boolean(),
        role: zod_1.z.string().min(2).max(180),
        organization: zod_1.z.string().min(2).max(180),
        country: zod_1.z.string().min(2).max(100),
    })).max(50).optional(),
    teamMembers: zod_1.z.array(zod_1.z.object({
        role: zod_1.z.enum(['advisor', 'team_member']),
        fullName: zod_1.z.string().trim().min(2).max(240),
        email: zod_1.z.string().trim().email().max(255),
    })).max(20).optional(),
    participationMode: zod_1.z.enum(['attendee', 'presenter']),
}).superRefine((value, ctx) => {
    if (value.participationMode !== 'presenter')
        return;
    if (!value.knowledgeAreaId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['knowledgeAreaId'],
            message: 'El área de conocimiento es obligatoria para ponentes.',
        });
    }
    if (!value.knowledgeLineId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ['knowledgeLineId'],
            message: 'El área relacionada es obligatoria para ponentes.',
        });
    }
});
exports.createRegistrationFormSchema = zod_1.z.object({
    registrationTypeId: zod_1.z.string().uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(160),
    description: zod_1.z.string().max(500).optional(),
    status: zod_1.z.enum(['draft', 'published']).optional(),
    submitButtonLabel: zod_1.z.string().min(2).max(80).optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updateRegistrationFormSchema = exports.createRegistrationFormSchema.partial();
exports.createRegistrationFormFieldSchema = zod_1.z.object({
    fieldKey: zod_1.z.string().min(2).max(120).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
    label: zod_1.z.string().min(2).max(180),
    fieldType: zod_1.z.enum(['text', 'textarea', 'email', 'phone', 'number', 'select', 'checkbox', 'radio', 'date', 'file', 'consent']),
    isRequired: zod_1.z.boolean().optional(),
    placeholder: zod_1.z.string().max(180).optional(),
    helpText: zod_1.z.string().max(300).optional(),
    options: zod_1.z.array(zod_1.z.object({ label: zod_1.z.string(), value: zod_1.z.string() })).optional(),
    validation: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updateRegistrationFormFieldSchema = exports.createRegistrationFormFieldSchema.partial();
exports.createEventMaterialSchema = zod_1.z.object({
    fileId: zod_1.z.string().uuid(),
    programId: zod_1.z.string().uuid().nullable().optional(),
    title: zod_1.z.string().min(2).max(180),
    description: zod_1.z.string().max(500).optional(),
    materialType: zod_1.z.enum(['convocatoria', 'plantilla_cartel', 'plantilla_presentacion', 'lineamientos', 'formato_resumen', 'reglamento', 'other']).optional(),
    visibility: zod_1.z.enum(['public', 'registered', 'registration_type']).optional(),
    registrationTypeId: zod_1.z.string().uuid().nullable().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updateEventMaterialSchema = exports.createEventMaterialSchema.partial();
exports.createCertificateTemplateSchema = zod_1.z.object({
    registrationTypeId: zod_1.z.string().uuid().nullable().optional(),
    programId: zod_1.z.string().uuid().nullable().optional(),
    backgroundFileId: zod_1.z.string().uuid().nullable().optional(),
    agendaItemId: zod_1.z.string().uuid().nullable().optional(),
    name: zod_1.z.string().min(2).max(160),
    certificateType: zod_1.z.string().min(2).max(60).default('participant'),
    targetRole: zod_1.z.enum(['participant', 'speaker', 'keynote_speaker', 'advisor', 'team_member']).optional(),
    recipientSource: zod_1.z.enum(['registration', 'speaker', 'team_advisor', 'team_member']).optional(),
    content: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    isActive: zod_1.z.boolean().optional(),
    autoIssue: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().min(0).optional(),
});
exports.updateCertificateTemplateSchema = exports.createCertificateTemplateSchema.partial();
exports.issueCertificateSchema = zod_1.z.object({
    registrationId: zod_1.z.string().uuid(),
});
exports.updateTeamCertificateSettingsSchema = zod_1.z.object({
    maxAdvisors: zod_1.z.number().int().min(0).max(20),
    maxTeamMembers: zod_1.z.number().int().min(0).max(20),
    certificateDelayMinutes: zod_1.z.number().int().min(0).max(10080),
});
exports.updateRegistrationStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['draft', 'pending_payment', 'registered', 'accepted_pending_payment', 'pending_review', 'approved', 'confirmed', 'cancelled', 'checked_in']),
    reason: zod_1.z.string().max(255).optional(),
});
//# sourceMappingURL=registration.schemas.js.map