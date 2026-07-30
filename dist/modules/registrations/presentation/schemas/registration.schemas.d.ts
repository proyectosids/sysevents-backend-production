import { z } from 'zod';
export declare const registrationEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const registrationParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    id: z.ZodString;
}, z.core.$strip>;
export declare const registrationFormParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    formId: z.ZodString;
}, z.core.$strip>;
export declare const registrationFormFieldParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    formId: z.ZodString;
    fieldId: z.ZodString;
}, z.core.$strip>;
export declare const registrationAddonParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    addonId: z.ZodString;
}, z.core.$strip>;
export declare const eventMaterialParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    materialId: z.ZodString;
}, z.core.$strip>;
export declare const certificateTemplateParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    templateId: z.ZodString;
}, z.core.$strip>;
export declare const createRegistrationTypeSchema: z.ZodObject<{
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priceCents: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateRegistrationTypeSchema: z.ZodObject<{
    programId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    priceCents: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    capacity: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createRegistrationAddonSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodDefault<z.ZodString>;
    priceCents: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    isRequired: z.ZodOptional<z.ZodBoolean>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const updateRegistrationAddonSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    category: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    priceCents: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    capacity: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    isRequired: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>;
export declare const createRegistrationSchema: z.ZodObject<{
    registrationTypeId: z.ZodString;
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    formId: z.ZodOptional<z.ZodString>;
    formAnswers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    addonSelections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        addonId: z.ZodString;
        quantity: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    institution: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodUnknown>;
    deferForm: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const createParticipantEnrollmentSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodString>;
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addonSelections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        addonId: z.ZodString;
        quantity: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
}, z.core.$strip>;
export declare const updateMyRegistrationSchema: z.ZodObject<{
    formId: z.ZodOptional<z.ZodString>;
    formAnswers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    institution: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    country: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    knowledgeAreaId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    knowledgeLineId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    professionalExperience: z.ZodOptional<z.ZodArray<z.ZodObject<{
        startYear: z.ZodNumber;
        endYear: z.ZodNullable<z.ZodNumber>;
        isCurrent: z.ZodBoolean;
        role: z.ZodString;
        organization: z.ZodString;
        country: z.ZodString;
    }, z.core.$strip>>>;
    participationMode: z.ZodEnum<{
        attendee: "attendee";
        presenter: "presenter";
    }>;
}, z.core.$strip>;
export declare const createRegistrationFormSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>;
    submitButtonLabel: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateRegistrationFormSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        draft: "draft";
        published: "published";
    }>>>;
    submitButtonLabel: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createRegistrationFormFieldSchema: z.ZodObject<{
    fieldKey: z.ZodString;
    label: z.ZodString;
    fieldType: z.ZodEnum<{
        number: "number";
        email: "email";
        date: "date";
        file: "file";
        phone: "phone";
        text: "text";
        textarea: "textarea";
        select: "select";
        checkbox: "checkbox";
        radio: "radio";
        consent: "consent";
    }>;
    isRequired: z.ZodOptional<z.ZodBoolean>;
    placeholder: z.ZodOptional<z.ZodString>;
    helpText: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>;
    validation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateRegistrationFormFieldSchema: z.ZodObject<{
    fieldKey: z.ZodOptional<z.ZodString>;
    label: z.ZodOptional<z.ZodString>;
    fieldType: z.ZodOptional<z.ZodEnum<{
        number: "number";
        email: "email";
        date: "date";
        file: "file";
        phone: "phone";
        text: "text";
        textarea: "textarea";
        select: "select";
        checkbox: "checkbox";
        radio: "radio";
        consent: "consent";
    }>>;
    isRequired: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    placeholder: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    helpText: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    options: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>>>;
    validation: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createEventMaterialSchema: z.ZodObject<{
    fileId: z.ZodString;
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    materialType: z.ZodOptional<z.ZodEnum<{
        other: "other";
        convocatoria: "convocatoria";
        plantilla_cartel: "plantilla_cartel";
        plantilla_presentacion: "plantilla_presentacion";
        lineamientos: "lineamientos";
        formato_resumen: "formato_resumen";
        reglamento: "reglamento";
    }>>;
    visibility: z.ZodOptional<z.ZodEnum<{
        registered: "registered";
        public: "public";
        registration_type: "registration_type";
    }>>;
    registrationTypeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateEventMaterialSchema: z.ZodObject<{
    fileId: z.ZodOptional<z.ZodString>;
    programId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    materialType: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        other: "other";
        convocatoria: "convocatoria";
        plantilla_cartel: "plantilla_cartel";
        plantilla_presentacion: "plantilla_presentacion";
        lineamientos: "lineamientos";
        formato_resumen: "formato_resumen";
        reglamento: "reglamento";
    }>>>;
    visibility: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        registered: "registered";
        public: "public";
        registration_type: "registration_type";
    }>>>;
    registrationTypeId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const createCertificateTemplateSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    programId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    backgroundFileId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    name: z.ZodString;
    certificateType: z.ZodDefault<z.ZodString>;
    targetRole: z.ZodOptional<z.ZodEnum<{
        participant: "participant";
        speaker: "speaker";
        advisor: "advisor";
    }>>;
    recipientSource: z.ZodOptional<z.ZodEnum<{
        speaker: "speaker";
        registration: "registration";
        advisor_manual: "advisor_manual";
    }>>;
    content: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateCertificateTemplateSchema: z.ZodObject<{
    registrationTypeId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    programId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    backgroundFileId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    name: z.ZodOptional<z.ZodString>;
    certificateType: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    targetRole: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        participant: "participant";
        speaker: "speaker";
        advisor: "advisor";
    }>>>;
    recipientSource: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        speaker: "speaker";
        registration: "registration";
        advisor_manual: "advisor_manual";
    }>>>;
    content: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    sortOrder: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export declare const issueCertificateSchema: z.ZodObject<{
    registrationId: z.ZodString;
}, z.core.$strip>;
export declare const updateRegistrationStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        draft: "draft";
        cancelled: "cancelled";
        accepted_pending_payment: "accepted_pending_payment";
        pending_payment: "pending_payment";
        registered: "registered";
        pending_review: "pending_review";
        approved: "approved";
        confirmed: "confirmed";
        checked_in: "checked_in";
    }>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
