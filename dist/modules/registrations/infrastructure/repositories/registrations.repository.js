"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
function mapRegistrationAddon(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        registrationTypeId: row.registration_type_id,
        name: row.name,
        description: row.description,
        category: row.category,
        priceCents: row.price_cents,
        currency: row.currency,
        capacity: row.capacity,
        isRequired: row.is_required,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        metadata: JSON.parse(row.metadata_json || '{}'),
    };
}
function parseJson(value, fallback) {
    try {
        return JSON.parse(value);
    }
    catch {
        return fallback;
    }
}
function mapRegistrationForm(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        registrationTypeId: row.registration_type_id,
        name: row.name,
        description: row.description,
        status: row.status,
        submitButtonLabel: row.submit_button_label,
        sortOrder: row.sort_order,
    };
}
function mapRegistrationFormField(row) {
    return {
        id: row.id,
        formId: row.form_id,
        fieldKey: row.field_key,
        label: row.label,
        fieldType: row.field_type,
        isRequired: row.is_required,
        placeholder: row.placeholder,
        helpText: row.help_text,
        options: parseJson(row.options_json, []),
        validation: parseJson(row.validation_json, {}),
        sortOrder: row.sort_order,
    };
}
function mapRegistration(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        registrationTypeId: row.registration_type_id,
        programId: row.program_id,
        participantProfileId: row.participant_profile_id,
        userId: row.user_id,
        status: row.status,
        amountCents: row.amount_cents,
        currency: row.currency,
        participationMode: row.participation_mode ?? 'presenter',
        knowledgeAreaId: row.knowledge_area_id ?? null,
        knowledgeLineId: row.knowledge_line_id ?? null,
        ...(row.email !== undefined ? {
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            institution: row.institution,
            country: row.country,
            professionalExperience: parseJson(row.professional_experience_json ?? '[]', []),
            teamMembers: parseJson(row.team_members_json ?? '[]', []),
            formId: row.form_id ?? null,
            formAnswers: parseJson(row.answers_json ?? '{}', {}),
            speakerId: row.speaker_id ?? null,
            eventName: row.event_name,
            eventSlug: row.event_slug,
            eventLogoFileId: row.event_logo_file_id ?? null,
            registrationTypeName: row.registration_type_name,
            programName: row.program_name ?? null,
        } : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
class RegistrationsRepository {
    async listRegistrationTypes(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT id, event_id AS eventId, program_id AS programId, name, description, price_cents AS priceCents,
          currency, capacity, is_active AS isActive, sort_order AS sortOrder
        FROM dbo.event_registration_types
        WHERE event_id = @eventId AND is_active = 1
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset;
    }
    async createRegistrationType(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('name', mssql_1.default.NVarChar(120), input.name)
            .input('description', mssql_1.default.NVarChar(255), input.description ?? null)
            .input('priceCents', mssql_1.default.Int, input.priceCents ?? 0)
            .input('currency', mssql_1.default.Char(3), input.currency ?? 'MXN')
            .input('capacity', mssql_1.default.Int, input.capacity ?? null)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .query(`
        INSERT INTO dbo.event_registration_types (
          event_id, program_id, name, description, price_cents, currency, capacity, is_active, sort_order
        )
        OUTPUT INSERTED.*
        VALUES (@eventId, @programId, @name, @description, @priceCents, @currency, @capacity, @isActive, @sortOrder)
      `);
        return result.recordset[0];
    }
    async updateRegistrationType(eventId, registrationTypeId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, registrationTypeId)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('updateProgramId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'programId'))
            .input('name', mssql_1.default.NVarChar(120), input.name ?? null)
            .input('description', mssql_1.default.NVarChar(255), input.description ?? null)
            .input('priceCents', mssql_1.default.Int, input.priceCents ?? null)
            .input('currency', mssql_1.default.Char(3), input.currency ?? null)
            .input('capacity', mssql_1.default.Int, input.capacity ?? null)
            .input('updateCapacity', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'capacity'))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .query(`
        UPDATE dbo.event_registration_types
        SET program_id = CASE WHEN @updateProgramId = 1 THEN @programId ELSE program_id END,
            name = COALESCE(@name, name),
            description = COALESCE(@description, description),
            price_cents = COALESCE(@priceCents, price_cents),
            currency = COALESCE(@currency, currency),
            capacity = CASE WHEN @updateCapacity = 1 THEN @capacity ELSE capacity END,
            is_active = COALESCE(@isActive, is_active),
            sort_order = COALESCE(@sortOrder, sort_order),
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id, INSERTED.event_id AS eventId, INSERTED.program_id AS programId,
          INSERTED.name, INSERTED.description, INSERTED.price_cents AS priceCents,
          INSERTED.currency, INSERTED.capacity, INSERTED.is_active AS isActive,
          INSERTED.sort_order AS sortOrder
        WHERE id = @registrationTypeId AND event_id = @eventId
      `);
        return result.recordset[0] ?? null;
    }
    async deactivateRegistrationType(eventId, registrationTypeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, registrationTypeId)
            .query(`
        UPDATE dbo.event_registration_types
        SET is_active = 0, updated_at = SYSUTCDATETIME()
        WHERE id = @registrationTypeId AND event_id = @eventId AND is_active = 1
      `);
        return (result.rowsAffected[0] ?? 0) > 0;
    }
    async listRegistrationAddons(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT *
        FROM dbo.event_registration_addons
        WHERE event_id = @eventId AND is_active = 1
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset.map(mapRegistrationAddon);
    }
    async createRegistrationAddon(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('name', mssql_1.default.NVarChar(140), input.name)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('category', mssql_1.default.NVarChar(80), input.category ?? 'general')
            .input('priceCents', mssql_1.default.Int, input.priceCents ?? 0)
            .input('currency', mssql_1.default.Char(3), input.currency ?? 'MXN')
            .input('capacity', mssql_1.default.Int, input.capacity ?? null)
            .input('isRequired', mssql_1.default.Bit, input.isRequired ?? false)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('metadataJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.metadata ?? {}))
            .query(`
        INSERT INTO dbo.event_registration_addons (
          event_id, registration_type_id, name, description, category, price_cents, currency, capacity,
          is_required, is_active, sort_order, metadata_json
        )
        OUTPUT
          INSERTED.id,
          INSERTED.event_id AS eventId,
          INSERTED.registration_type_id AS registrationTypeId,
          INSERTED.name,
          INSERTED.description,
          INSERTED.category,
          INSERTED.price_cents AS priceCents,
          INSERTED.currency,
          INSERTED.capacity,
          INSERTED.is_required AS isRequired,
          INSERTED.is_active AS isActive,
          INSERTED.sort_order AS sortOrder,
          INSERTED.metadata_json AS metadataJson
        VALUES (
          @eventId, @registrationTypeId, @name, @description, @category, @priceCents, @currency, @capacity,
          @isRequired, @isActive, @sortOrder, @metadataJson
        )
      `);
        return result.recordset[0];
    }
    async updateRegistrationAddon(eventId, addonId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('addonId', mssql_1.default.UniqueIdentifier, addonId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('updateRegistrationTypeId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'registrationTypeId'))
            .input('name', mssql_1.default.NVarChar(140), input.name ?? null)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('updateDescription', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'description'))
            .input('category', mssql_1.default.NVarChar(80), input.category ?? null)
            .input('priceCents', mssql_1.default.Int, input.priceCents ?? null)
            .input('currency', mssql_1.default.Char(3), input.currency ?? null)
            .input('capacity', mssql_1.default.Int, input.capacity ?? null)
            .input('updateCapacity', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'capacity'))
            .input('isRequired', mssql_1.default.Bit, input.isRequired ?? null)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .input('metadataJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.metadata === undefined ? null : JSON.stringify(input.metadata))
            .query(`
        UPDATE dbo.event_registration_addons
        SET registration_type_id = CASE WHEN @updateRegistrationTypeId = 1 THEN @registrationTypeId ELSE registration_type_id END,
            name = COALESCE(@name, name),
            description = CASE WHEN @updateDescription = 1 THEN @description ELSE description END,
            category = COALESCE(@category, category),
            price_cents = COALESCE(@priceCents, price_cents),
            currency = COALESCE(@currency, currency),
            capacity = CASE WHEN @updateCapacity = 1 THEN @capacity ELSE capacity END,
            is_required = COALESCE(@isRequired, is_required),
            is_active = COALESCE(@isActive, is_active),
            sort_order = COALESCE(@sortOrder, sort_order),
            metadata_json = COALESCE(@metadataJson, metadata_json),
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @addonId AND event_id = @eventId AND is_active = 1
      `);
        return result.recordset[0] ? mapRegistrationAddon(result.recordset[0]) : null;
    }
    async deleteRegistrationAddon(eventId, addonId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('addonId', mssql_1.default.UniqueIdentifier, addonId)
            .query(`
        UPDATE dbo.event_registration_addons
        SET is_active = 0, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id
        WHERE id = @addonId AND event_id = @eventId AND is_active = 1
      `);
        return Boolean(result.recordset[0]);
    }
    async findRegistrationType(eventId, registrationTypeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, registrationTypeId)
            .query(`
        SELECT TOP 1 * FROM dbo.event_registration_types
        WHERE id = @registrationTypeId AND event_id = @eventId
      `);
        return result.recordset[0] ?? null;
    }
    async findDefaultRegistrationTypeForProgram(eventId, programId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, programId ?? null)
            .query(`
        SELECT TOP 1 *
        FROM dbo.event_registration_types
        WHERE event_id = @eventId
          AND is_active = 1
          AND (
            (@programId IS NOT NULL AND program_id = @programId)
            OR (@programId IS NULL AND program_id IS NULL)
            OR program_id IS NULL
          )
        ORDER BY CASE
          WHEN @programId IS NOT NULL AND program_id = @programId THEN 0
          WHEN @programId IS NULL AND program_id IS NULL THEN 0
          ELSE 1
        END, price_cents ASC, created_at ASC
      `);
        return result.recordset[0] ?? null;
    }
    async listRegistrationForms(eventId, includeDrafts = false) {
        const pool = await (0, database_1.getSqlPool)();
        const forms = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('includeDrafts', mssql_1.default.Bit, includeDrafts)
            .query(`
        SELECT *
        FROM dbo.event_registration_forms
        WHERE event_id = @eventId
          AND deleted_at IS NULL
          AND (@includeDrafts = 1 OR status = 'published')
        ORDER BY sort_order ASC, created_at ASC
      `);
        const fields = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT f.*
        FROM dbo.event_registration_form_fields f
        INNER JOIN dbo.event_registration_forms rf ON rf.id = f.form_id
        WHERE rf.event_id = @eventId AND f.deleted_at IS NULL
        ORDER BY f.sort_order ASC, f.created_at ASC
      `);
        return forms.recordset.map((form) => ({
            ...mapRegistrationForm(form),
            fields: fields.recordset.filter((field) => field.form_id === form.id).map(mapRegistrationFormField),
        }));
    }
    async createRegistrationForm(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('name', mssql_1.default.NVarChar(160), input.name)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'draft')
            .input('submitButtonLabel', mssql_1.default.NVarChar(80), input.submitButtonLabel ?? 'Enviar registro')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
            .query(`
        INSERT INTO dbo.event_registration_forms (
          event_id, registration_type_id, name, description, status, submit_button_label, sort_order, created_by, updated_by
        )
        OUTPUT INSERTED.*
        VALUES (@eventId, @registrationTypeId, @name, @description, @status, @submitButtonLabel, @sortOrder, @userId, @userId)
      `);
        return { ...mapRegistrationForm(result.recordset[0]), fields: [] };
    }
    async createRegistrationFormField(formId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const existing = await pool
            .request()
            .input('formId', mssql_1.default.UniqueIdentifier, formId)
            .input('fieldKey', mssql_1.default.NVarChar(120), input.fieldKey)
            .query(`
        SELECT TOP 1 *
        FROM dbo.event_registration_form_fields
        WHERE form_id = @formId AND field_key = @fieldKey
        ORDER BY CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END, created_at DESC
      `);
        if (existing.recordset[0]?.deleted_at === null) {
            throw new app_error_1.AppError(`A field with key ${input.fieldKey} already exists in this form`, 409, 'REGISTRATION_FORM_FIELD_ALREADY_EXISTS');
        }
        if (existing.recordset[0]) {
            const restored = await pool
                .request()
                .input('fieldId', mssql_1.default.UniqueIdentifier, existing.recordset[0].id)
                .input('label', mssql_1.default.NVarChar(180), input.label)
                .input('fieldType', mssql_1.default.NVarChar(40), input.fieldType)
                .input('isRequired', mssql_1.default.Bit, input.isRequired ?? false)
                .input('placeholder', mssql_1.default.NVarChar(180), input.placeholder ?? null)
                .input('helpText', mssql_1.default.NVarChar(300), input.helpText ?? null)
                .input('optionsJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.options ?? []))
                .input('validationJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.validation ?? {}))
                .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
                .query(`
          UPDATE dbo.event_registration_form_fields
          SET label = @label,
              field_type = @fieldType,
              is_required = @isRequired,
              placeholder = @placeholder,
              help_text = @helpText,
              options_json = @optionsJson,
              validation_json = @validationJson,
              sort_order = @sortOrder,
              deleted_at = NULL,
              updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @fieldId
        `);
            return mapRegistrationFormField(restored.recordset[0]);
        }
        const result = await pool
            .request()
            .input('formId', mssql_1.default.UniqueIdentifier, formId)
            .input('fieldKey', mssql_1.default.NVarChar(120), input.fieldKey)
            .input('label', mssql_1.default.NVarChar(180), input.label)
            .input('fieldType', mssql_1.default.NVarChar(40), input.fieldType)
            .input('isRequired', mssql_1.default.Bit, input.isRequired ?? false)
            .input('placeholder', mssql_1.default.NVarChar(180), input.placeholder ?? null)
            .input('helpText', mssql_1.default.NVarChar(300), input.helpText ?? null)
            .input('optionsJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.options ?? []))
            .input('validationJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.validation ?? {}))
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .query(`
        INSERT INTO dbo.event_registration_form_fields (
          form_id, field_key, label, field_type, is_required, placeholder, help_text, options_json, validation_json, sort_order
        )
        OUTPUT INSERTED.*
        VALUES (@formId, @fieldKey, @label, @fieldType, @isRequired, @placeholder, @helpText, @optionsJson, @validationJson, @sortOrder)
      `);
        return mapRegistrationFormField(result.recordset[0]);
    }
    async updateRegistrationFormField(eventId, formId, fieldId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('formId', mssql_1.default.UniqueIdentifier, formId)
            .input('fieldId', mssql_1.default.UniqueIdentifier, fieldId)
            .input('fieldKey', mssql_1.default.NVarChar(120), input.fieldKey ?? null)
            .input('label', mssql_1.default.NVarChar(180), input.label ?? null)
            .input('fieldType', mssql_1.default.NVarChar(40), input.fieldType ?? null)
            .input('isRequired', mssql_1.default.Bit, input.isRequired ?? null)
            .input('placeholder', mssql_1.default.NVarChar(180), input.placeholder ?? null)
            .input('helpText', mssql_1.default.NVarChar(300), input.helpText ?? null)
            .input('optionsJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.options === undefined ? null : JSON.stringify(input.options))
            .input('validationJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.validation === undefined ? null : JSON.stringify(input.validation))
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .query(`
        UPDATE field
        SET field_key = COALESCE(@fieldKey, field.field_key),
            label = COALESCE(@label, field.label),
            field_type = COALESCE(@fieldType, field.field_type),
            is_required = COALESCE(@isRequired, field.is_required),
            placeholder = CASE WHEN @placeholder IS NULL THEN field.placeholder ELSE @placeholder END,
            help_text = CASE WHEN @helpText IS NULL THEN field.help_text ELSE @helpText END,
            options_json = COALESCE(@optionsJson, field.options_json),
            validation_json = COALESCE(@validationJson, field.validation_json),
            sort_order = COALESCE(@sortOrder, field.sort_order),
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        FROM dbo.event_registration_form_fields field
        INNER JOIN dbo.event_registration_forms form ON form.id = field.form_id
        WHERE field.id = @fieldId
          AND field.form_id = @formId
          AND form.event_id = @eventId
          AND field.deleted_at IS NULL
          AND form.deleted_at IS NULL
      `);
        return result.recordset[0] ? mapRegistrationFormField(result.recordset[0]) : null;
    }
    async deleteRegistrationFormField(eventId, formId, fieldId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('formId', mssql_1.default.UniqueIdentifier, formId)
            .input('fieldId', mssql_1.default.UniqueIdentifier, fieldId)
            .query(`
        UPDATE field
        SET deleted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id
        FROM dbo.event_registration_form_fields field
        INNER JOIN dbo.event_registration_forms form ON form.id = field.form_id
        WHERE field.id = @fieldId
          AND field.form_id = @formId
          AND form.event_id = @eventId
          AND field.deleted_at IS NULL
          AND form.deleted_at IS NULL
      `);
        return Boolean(result.recordset[0]);
    }
    async findRegistrationFormForType(eventId, registrationTypeId, formId, transaction) {
        const request = transaction.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, registrationTypeId)
            .input('formId', mssql_1.default.UniqueIdentifier, formId ?? null);
        const result = await request.query(`
      SELECT TOP 1 *
      FROM dbo.event_registration_forms
      WHERE event_id = @eventId
        AND status = 'published'
        AND deleted_at IS NULL
        AND (
          (@formId IS NOT NULL AND id = @formId)
          OR (@formId IS NULL AND (registration_type_id = @registrationTypeId OR registration_type_id IS NULL))
        )
      ORDER BY CASE WHEN registration_type_id = @registrationTypeId THEN 0 ELSE 1 END, sort_order ASC
    `);
        return result.recordset[0] ? mapRegistrationForm(result.recordset[0]) : null;
    }
    async validateFormAnswers(formId, answers, transaction) {
        const result = await transaction
            .request()
            .input('formId', mssql_1.default.UniqueIdentifier, formId)
            .query(`
        SELECT *
        FROM dbo.event_registration_form_fields
        WHERE form_id = @formId AND deleted_at IS NULL
      `);
        for (const field of result.recordset) {
            const value = answers[field.field_key];
            const missing = value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
            if (field.is_required && missing) {
                throw new app_error_1.AppError(`Field ${field.label} is required`, 400, 'REGISTRATION_FORM_FIELD_REQUIRED');
            }
        }
    }
    async createRegistration(input) {
        const registrationType = await this.findRegistrationType(input.eventId, input.registrationTypeId);
        if (!registrationType || !registrationType.is_active) {
            throw new app_error_1.AppError('Registration type not found', 404, 'REGISTRATION_TYPE_NOT_FOUND');
        }
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const duplicate = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('email', mssql_1.default.NVarChar(255), input.email.toLowerCase())
                .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
                .query(`
          SELECT COUNT(1) AS total
          FROM dbo.event_registrations r
          INNER JOIN dbo.participant_profiles p ON p.id = r.participant_profile_id
          WHERE r.event_id = @eventId
            AND r.status <> 'cancelled'
            AND (p.email = @email OR (@userId IS NOT NULL AND r.user_id = @userId))
        `);
            if ((duplicate.recordset[0]?.total ?? 0) > 0) {
                throw new app_error_1.AppError('Participant is already registered for this event', 409, 'REGISTRATION_ALREADY_EXISTS');
            }
            if (registrationType.capacity !== null) {
                const capacity = await transaction
                    .request()
                    .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                    .query(`
            SELECT COUNT(1) AS total FROM dbo.event_registrations
            WHERE registration_type_id = @registrationTypeId AND status IN ('pending_payment', 'pending_review', 'accepted_pending_payment', 'registered', 'confirmed', 'checked_in')
          `);
                if ((capacity.recordset[0]?.total ?? 0) >= registrationType.capacity) {
                    throw new app_error_1.AppError('Registration type capacity is full', 409, 'REGISTRATION_CAPACITY_FULL');
                }
            }
            const profileResult = await transaction
                .request()
                .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
                .input('email', mssql_1.default.NVarChar(255), input.email.toLowerCase())
                .input('firstName', mssql_1.default.NVarChar(120), input.firstName)
                .input('lastName', mssql_1.default.NVarChar(120), input.lastName)
                .input('phone', mssql_1.default.NVarChar(40), input.phone ?? null)
                .input('institution', mssql_1.default.NVarChar(180), input.institution ?? null)
                .input('country', mssql_1.default.NVarChar(100), input.country ?? null)
                .query(`
          INSERT INTO dbo.participant_profiles (user_id, email, first_name, last_name, phone, institution, country)
          OUTPUT INSERTED.id
          VALUES (@userId, @email, @firstName, @lastName, @phone, @institution, @country)
        `);
            const addonSelections = input.deferPaymentSelection ? [] : input.addonSelections ?? [];
            let addonsTotalCents = 0;
            for (const selection of addonSelections) {
                const addon = await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                    .input('addonId', mssql_1.default.UniqueIdentifier, selection.addonId)
                    .query(`
            SELECT TOP 1 *
            FROM dbo.event_registration_addons
            WHERE id = @addonId
              AND event_id = @eventId
              AND is_active = 1
              AND (registration_type_id IS NULL OR registration_type_id = @registrationTypeId)
          `);
                const row = addon.recordset[0];
                if (!row) {
                    throw new app_error_1.AppError('Registration add-on not found', 404, 'REGISTRATION_ADDON_NOT_FOUND');
                }
                if (row.capacity !== null) {
                    const capacity = await transaction
                        .request()
                        .input('addonId', mssql_1.default.UniqueIdentifier, selection.addonId)
                        .query(`
              SELECT COALESCE(SUM(quantity), 0) AS total
              FROM dbo.event_registration_addon_selections
              WHERE addon_id = @addonId
            `);
                    if ((capacity.recordset[0]?.total ?? 0) + selection.quantity > row.capacity) {
                        throw new app_error_1.AppError('Registration add-on capacity is full', 409, 'REGISTRATION_ADDON_CAPACITY_FULL');
                    }
                }
                addonsTotalCents += row.price_cents * selection.quantity;
            }
            const totalAmountCents = input.deferPaymentSelection ? 0 : registrationType.price_cents + addonsTotalCents;
            const settings = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .query('SELECT TOP 1 payment_policy FROM dbo.event_settings WHERE event_id = @eventId');
            const paymentPolicy = settings.recordset[0]?.payment_policy ?? 'immediate';
            const status = paymentPolicy === 'free'
                ? 'confirmed'
                : (input.deferForm || paymentPolicy === 'after_acceptance') && totalAmountCents > 0
                    ? 'pending_review'
                    : totalAmountCents > 0
                        ? 'pending_payment'
                        : 'registered';
            const form = input.deferForm ? null : await this.findRegistrationFormForType(input.eventId, input.registrationTypeId, input.formId, transaction);
            if (form && !input.deferForm) {
                await this.validateFormAnswers(form.id, input.formAnswers ?? {}, transaction);
            }
            const registrationResult = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? registrationType.program_id ?? null)
                .input('participantProfileId', mssql_1.default.UniqueIdentifier, profileResult.recordset[0].id)
                .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
                .input('status', mssql_1.default.NVarChar(40), status)
                .input('amountCents', mssql_1.default.Int, totalAmountCents)
                .input('currency', mssql_1.default.Char(3), registrationType.currency)
                .input('metadataJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.metadata ?? {}))
                .query(`
          INSERT INTO dbo.event_registrations (
            event_id, registration_type_id, program_id, participant_profile_id, user_id, status, amount_cents, currency, metadata_json
          )
          OUTPUT INSERTED.*
          VALUES (@eventId, @registrationTypeId, @programId, @participantProfileId, @userId, @status, @amountCents, @currency, @metadataJson)
        `);
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationResult.recordset[0].id)
                .input('toStatus', mssql_1.default.NVarChar(40), status)
                .query(`
          INSERT INTO dbo.event_registration_status_history (registration_id, to_status, reason)
          VALUES (@registrationId, @toStatus, 'registration_created')
        `);
            for (const selection of addonSelections) {
                const addon = await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                    .input('addonId', mssql_1.default.UniqueIdentifier, selection.addonId)
                    .query(`
            SELECT TOP 1 *
            FROM dbo.event_registration_addons
            WHERE id = @addonId
              AND event_id = @eventId
              AND is_active = 1
              AND (registration_type_id IS NULL OR registration_type_id = @registrationTypeId)
          `);
                const row = addon.recordset[0];
                await transaction
                    .request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, registrationResult.recordset[0].id)
                    .input('addonId', mssql_1.default.UniqueIdentifier, selection.addonId)
                    .input('quantity', mssql_1.default.Int, selection.quantity)
                    .input('unitPriceCents', mssql_1.default.Int, row.price_cents)
                    .input('totalPriceCents', mssql_1.default.Int, row.price_cents * selection.quantity)
                    .query(`
            INSERT INTO dbo.event_registration_addon_selections (
              registration_id, addon_id, quantity, unit_price_cents, total_price_cents
            )
            VALUES (@registrationId, @addonId, @quantity, @unitPriceCents, @totalPriceCents)
          `);
            }
            if (form) {
                await transaction
                    .request()
                    .input('formId', mssql_1.default.UniqueIdentifier, form.id)
                    .input('registrationId', mssql_1.default.UniqueIdentifier, registrationResult.recordset[0].id)
                    .input('answersJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.formAnswers ?? {}))
                    .query(`
            INSERT INTO dbo.event_registration_form_responses (form_id, registration_id, answers_json)
            VALUES (@formId, @registrationId, @answersJson)
          `);
            }
            await transaction.commit();
            return mapRegistration(registrationResult.recordset[0]);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async updateMyRegistration(eventId, registrationId, userId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const current = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          SELECT TOP 1 registration.participant_profile_id, registration.registration_type_id, registration.status,
            registration.amount_cents, JSON_VALUE(program.settings_json, '$.fullSubmissionType') AS full_submission_type
          FROM dbo.event_registrations registration
          LEFT JOIN dbo.event_programs program ON program.id = registration.program_id
          WHERE registration.id = @registrationId AND registration.event_id = @eventId AND registration.user_id = @userId
        `);
            const registration = current.recordset[0];
            if (!registration) {
                await transaction.rollback();
                return null;
            }
            const isPresenter = input.participationMode === 'presenter';
            const knowledgeAreaId = isPresenter ? input.knowledgeAreaId : null;
            const knowledgeLineId = isPresenter ? input.knowledgeLineId : null;
            if (isPresenter) {
                const knowledgeSelection = await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                    .input('areaId', mssql_1.default.UniqueIdentifier, knowledgeAreaId)
                    .input('lineId', mssql_1.default.UniqueIdentifier, knowledgeLineId)
                    .query(`
          SELECT COUNT(1) AS total
          FROM dbo.event_knowledge_areas area
          INNER JOIN dbo.event_knowledge_lines line ON line.id = @lineId
            AND line.event_id = area.event_id
            AND (line.area_id = area.id OR line.area_id IS NULL)
            AND line.is_active = 1 AND line.deleted_at IS NULL
          WHERE area.id = @areaId AND area.event_id = @eventId
            AND area.is_active = 1 AND area.deleted_at IS NULL
        `);
                if ((knowledgeSelection.recordset[0]?.total ?? 0) === 0) {
                    throw new app_error_1.AppError('El área y la línea de conocimiento seleccionadas no son válidas.', 400, 'INVALID_KNOWLEDGE_SELECTION');
                }
            }
            const programSkipsSubmission = registration.full_submission_type === 'none';
            const nextStatus = input.participationMode === 'attendee'
                ? (registration.amount_cents > 0 ? 'pending_payment' : 'confirmed')
                : programSkipsSubmission
                    ? 'accepted_pending_payment'
                    : (['accepted_pending_payment', 'confirmed', 'checked_in'].includes(registration.status) ? registration.status : 'pending_review');
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                .input('areaId', mssql_1.default.UniqueIdentifier, knowledgeAreaId)
                .input('lineId', mssql_1.default.UniqueIdentifier, knowledgeLineId)
                .input('participationMode', mssql_1.default.NVarChar(20), input.participationMode)
                .input('status', mssql_1.default.NVarChar(40), nextStatus)
                .query(`
          UPDATE dbo.event_registrations
          SET knowledge_area_id = @areaId, knowledge_line_id = @lineId,
              participation_mode = @participationMode, status = @status, updated_at = SYSUTCDATETIME()
          WHERE id = @registrationId
        `);
            if (input.professionalExperience) {
                const professionalExperience = [...input.professionalExperience].sort((a, b) => {
                    const aCurrent = a.isCurrent === true ? 1 : 0;
                    const bCurrent = b.isCurrent === true ? 1 : 0;
                    return bCurrent - aCurrent
                        || Number(b.endYear ?? b.startYear ?? 0) - Number(a.endYear ?? a.startYear ?? 0)
                        || Number(b.startYear ?? 0) - Number(a.startYear ?? 0);
                });
                await transaction
                    .request()
                    .input('profileId', mssql_1.default.UniqueIdentifier, registration.participant_profile_id)
                    .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                    .input('experienceJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(professionalExperience))
                    .query(`
            UPDATE dbo.participant_profiles
            SET professional_experience_json = @experienceJson, updated_at = SYSUTCDATETIME()
            WHERE id = @profileId;

            UPDATE dbo.event_speakers
            SET professional_experience_json = @experienceJson, updated_at = SYSUTCDATETIME()
            WHERE source_registration_id IN (
              SELECT id FROM dbo.event_registrations WHERE participant_profile_id = @profileId
            ) AND deleted_at IS NULL;
          `);
            }
            // Knowledge classification belongs to the participant registration.
            // Keep every linked work consistent regardless of where it was edited.
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                .input('areaId', mssql_1.default.UniqueIdentifier, knowledgeAreaId)
                .input('lineId', mssql_1.default.UniqueIdentifier, knowledgeLineId)
                .query(`
          UPDATE dbo.submissions
          SET knowledge_area_id = @areaId, knowledge_line_id = @lineId, updated_at = SYSUTCDATETIME()
          WHERE registration_id = @registrationId
        `);
            await transaction
                .request()
                .input('profileId', mssql_1.default.UniqueIdentifier, registration.participant_profile_id)
                .input('phone', mssql_1.default.NVarChar(40), input.phone ?? null)
                .input('institution', mssql_1.default.NVarChar(180), input.institution ?? null)
                .input('country', mssql_1.default.NVarChar(100), input.country ?? null)
                .input('updatePhone', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'phone'))
                .input('updateInstitution', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'institution'))
                .input('updateCountry', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'country'))
                .query(`
          UPDATE dbo.participant_profiles
          SET phone = CASE WHEN @updatePhone = 1 THEN @phone ELSE phone END,
              institution = CASE WHEN @updateInstitution = 1 THEN @institution ELSE institution END,
              country = CASE WHEN @updateCountry = 1 THEN @country ELSE country END,
              updated_at = SYSUTCDATETIME()
          WHERE id = @profileId
        `);
            if (input.teamMembers) {
                const settings = await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                    .query(`
            SELECT TOP 1 max_advisors_per_team, max_team_members_per_team
            FROM dbo.event_settings WHERE event_id = @eventId
          `);
                const maxAdvisors = settings.recordset[0]?.max_advisors_per_team ?? 2;
                const maxTeamMembers = settings.recordset[0]?.max_team_members_per_team ?? 2;
                const advisors = input.teamMembers.filter((member) => member.role === 'advisor');
                const teamMembers = input.teamMembers.filter((member) => member.role === 'team_member');
                if (advisors.length > maxAdvisors || teamMembers.length > maxTeamMembers) {
                    throw new app_error_1.AppError('El equipo excede los límites configurados para el evento.', 400, 'TEAM_MEMBER_LIMIT_EXCEEDED');
                }
                const normalizedEmails = input.teamMembers.map((member) => member.email.trim().toLowerCase());
                if (new Set(normalizedEmails).size !== normalizedEmails.length) {
                    throw new app_error_1.AppError('No se puede repetir el correo de un integrante o asesor.', 400, 'DUPLICATE_TEAM_MEMBER_EMAIL');
                }
                await transaction.request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                    .query('DELETE FROM dbo.event_registration_team_members WHERE registration_id = @registrationId');
                for (let index = 0; index < input.teamMembers.length; index += 1) {
                    const member = input.teamMembers[index];
                    await transaction.request()
                        .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                        .input('role', mssql_1.default.NVarChar(30), member.role)
                        .input('fullName', mssql_1.default.NVarChar(240), member.fullName.trim())
                        .input('email', mssql_1.default.NVarChar(255), member.email.trim().toLowerCase())
                        .input('sortOrder', mssql_1.default.Int, index)
                        .query(`
              INSERT INTO dbo.event_registration_team_members (registration_id, role, full_name, email, sort_order)
              VALUES (@registrationId, @role, @fullName, @email, @sortOrder)
            `);
                }
            }
            const form = await this.findRegistrationFormForType(eventId, registration.registration_type_id, input.formId, transaction);
            if (form && input.formAnswers) {
                await this.validateFormAnswers(form.id, input.formAnswers, transaction);
                await transaction
                    .request()
                    .input('formId', mssql_1.default.UniqueIdentifier, form.id)
                    .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                    .input('answersJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.formAnswers))
                    .query(`
            IF EXISTS (SELECT 1 FROM dbo.event_registration_form_responses WHERE registration_id = @registrationId)
              UPDATE dbo.event_registration_form_responses
              SET form_id = @formId, answers_json = @answersJson, submitted_at = SYSUTCDATETIME()
              WHERE registration_id = @registrationId
            ELSE
              INSERT INTO dbo.event_registration_form_responses (form_id, registration_id, answers_json)
              VALUES (@formId, @registrationId, @answersJson)
          `);
            }
            await transaction.commit();
            return this.findEventRegistration(eventId, registrationId);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async listMyRegistrations(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT r.*, p.email, p.first_name, p.last_name, p.phone, p.institution, p.country, p.professional_experience_json,
          (SELECT member.id, member.role, member.full_name AS fullName, member.email, member.sort_order AS sortOrder
           FROM dbo.event_registration_team_members member WHERE member.registration_id = r.id
           ORDER BY member.role, member.sort_order FOR JSON PATH) AS team_members_json,
          response.form_id, response.answers_json, speaker.id AS speaker_id,
          e.name AS event_name, e.slug AS event_slug, e.logo_file_id AS event_logo_file_id,
          rt.name AS registration_type_name,
          program.name AS program_name
        FROM dbo.event_registrations r
        INNER JOIN dbo.participant_profiles p ON p.id = r.participant_profile_id
        INNER JOIN dbo.events e ON e.id = r.event_id
        INNER JOIN dbo.event_registration_types rt ON rt.id = r.registration_type_id
        LEFT JOIN dbo.event_programs program ON program.id = r.program_id
        LEFT JOIN dbo.event_registration_form_responses response ON response.registration_id = r.id
        LEFT JOIN dbo.event_speakers speaker ON speaker.source_registration_id = r.id AND speaker.deleted_at IS NULL
        WHERE r.user_id = @userId
        ORDER BY r.created_at DESC
      `);
        return result.recordset.map(mapRegistration);
    }
    async applyPaymentSelection(eventId, registrationId, userId, input) {
        const registrationType = await this.findRegistrationType(eventId, input.registrationTypeId);
        if (!registrationType || !registrationType.is_active) {
            throw new app_error_1.AppError('Registration type not found', 404, 'REGISTRATION_TYPE_NOT_FOUND');
        }
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const current = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          SELECT TOP 1 *
          FROM dbo.event_registrations
          WHERE id = @registrationId AND event_id = @eventId AND user_id = @userId
        `);
            const registration = current.recordset[0];
            if (!registration) {
                await transaction.rollback();
                return null;
            }
            if (registration.program_id && registrationType.program_id && registration.program_id !== registrationType.program_id) {
                throw new app_error_1.AppError('Registration package does not belong to the selected program', 409, 'REGISTRATION_PACKAGE_PROGRAM_MISMATCH');
            }
            const selectedAddonIds = new Set((input.addonSelections ?? []).map((selection) => selection.addonId));
            const requiredAddons = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                .query(`
          SELECT *
          FROM dbo.event_registration_addons
          WHERE event_id = @eventId
            AND is_active = 1
            AND is_required = 1
            AND (registration_type_id IS NULL OR registration_type_id = @registrationTypeId)
        `);
            for (const addon of requiredAddons.recordset) {
                selectedAddonIds.add(addon.id);
            }
            const selections = [...selectedAddonIds].map((addonId) => ({ addonId, quantity: 1 }));
            let addonsTotalCents = 0;
            const selectedRows = [];
            for (const selection of selections) {
                const addon = await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                    .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                    .input('addonId', mssql_1.default.UniqueIdentifier, selection.addonId)
                    .query(`
            SELECT TOP 1 *
            FROM dbo.event_registration_addons
            WHERE id = @addonId
              AND event_id = @eventId
              AND is_active = 1
              AND (registration_type_id IS NULL OR registration_type_id = @registrationTypeId)
          `);
                const row = addon.recordset[0];
                if (!row) {
                    throw new app_error_1.AppError('Registration add-on not found', 404, 'REGISTRATION_ADDON_NOT_FOUND');
                }
                selectedRows.push(row);
                if (!row.is_required) {
                    addonsTotalCents += row.price_cents * selection.quantity;
                }
            }
            const totalAmountCents = registrationType.price_cents + addonsTotalCents;
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                .query('DELETE FROM dbo.event_registration_addon_selections WHERE registration_id = @registrationId');
            for (const row of selectedRows) {
                await transaction
                    .request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                    .input('addonId', mssql_1.default.UniqueIdentifier, row.id)
                    .input('quantity', mssql_1.default.Int, 1)
                    .input('unitPriceCents', mssql_1.default.Int, row.is_required ? 0 : row.price_cents)
                    .input('totalPriceCents', mssql_1.default.Int, row.is_required ? 0 : row.price_cents)
                    .query(`
            INSERT INTO dbo.event_registration_addon_selections (
              registration_id, addon_id, quantity, unit_price_cents, total_price_cents
            )
            VALUES (@registrationId, @addonId, @quantity, @unitPriceCents, @totalPriceCents)
          `);
            }
            const nextStatus = registration.participation_mode !== 'attendee'
                ? (totalAmountCents > 0 ? 'accepted_pending_payment' : 'confirmed')
                : (totalAmountCents > 0 ? 'pending_payment' : 'confirmed');
            const result = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
                .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId)
                .input('amountCents', mssql_1.default.Int, totalAmountCents)
                .input('currency', mssql_1.default.Char(3), registrationType.currency)
                .input('status', mssql_1.default.NVarChar(40), nextStatus)
                .query(`
          UPDATE dbo.event_registrations
          SET registration_type_id = @registrationTypeId,
              amount_cents = @amountCents,
              currency = @currency,
              status = @status,
              updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @registrationId AND event_id = @eventId
        `);
            await transaction.commit();
            return result.recordset[0] ? mapRegistration(result.recordset[0]) : null;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async listEventRegistrations(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT r.*, p.email, p.first_name, p.last_name, p.phone, p.institution, p.country, p.professional_experience_json,
          (SELECT member.id, member.role, member.full_name AS fullName, member.email, member.sort_order AS sortOrder
           FROM dbo.event_registration_team_members member WHERE member.registration_id = r.id
           ORDER BY member.role, member.sort_order FOR JSON PATH) AS team_members_json,
          response.form_id, response.answers_json, speaker.id AS speaker_id
        FROM dbo.event_registrations r
        INNER JOIN dbo.participant_profiles p ON p.id = r.participant_profile_id
        LEFT JOIN dbo.event_registration_form_responses response ON response.registration_id = r.id
        LEFT JOIN dbo.event_speakers speaker ON speaker.source_registration_id = r.id AND speaker.deleted_at IS NULL
        WHERE r.event_id = @eventId
        ORDER BY r.created_at DESC
      `);
        return result.recordset.map(mapRegistration);
    }
    async findEventRegistration(eventId, id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`
          SELECT TOP 1 r.*, p.email, p.first_name, p.last_name, p.phone, p.institution, p.country, p.professional_experience_json,
            (SELECT member.id, member.role, member.full_name AS fullName, member.email, member.sort_order AS sortOrder
             FROM dbo.event_registration_team_members member WHERE member.registration_id = r.id
             ORDER BY member.role, member.sort_order FOR JSON PATH) AS team_members_json
        FROM dbo.event_registrations r
        INNER JOIN dbo.participant_profiles p ON p.id = r.participant_profile_id
        WHERE r.event_id = @eventId AND r.id = @id
      `);
        return result.recordset[0] ? mapRegistration(result.recordset[0]) : null;
    }
    async updateRegistrationStatus(eventId, id, status, changedBy, reason) {
        const registration = await this.findEventRegistration(eventId, id);
        if (!registration) {
            return null;
        }
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction
                .request()
                .input('id', mssql_1.default.UniqueIdentifier, id)
                .input('status', mssql_1.default.NVarChar(40), status)
                .query(`
          UPDATE dbo.event_registrations
          SET status = @status,
              checked_in_at = CASE WHEN @status = 'checked_in' THEN SYSUTCDATETIME() ELSE checked_in_at END,
              cancelled_at = CASE WHEN @status = 'cancelled' THEN SYSUTCDATETIME() ELSE cancelled_at END,
              updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, id)
                .input('fromStatus', mssql_1.default.NVarChar(40), registration.status)
                .input('toStatus', mssql_1.default.NVarChar(40), status)
                .input('changedBy', mssql_1.default.UniqueIdentifier, changedBy ?? null)
                .input('reason', mssql_1.default.NVarChar(255), reason ?? null)
                .query(`
          INSERT INTO dbo.event_registration_status_history (registration_id, from_status, to_status, changed_by, reason)
          VALUES (@registrationId, @fromStatus, @toStatus, @changedBy, @reason)
        `);
            if (['approved', 'accepted_pending_payment', 'confirmed'].includes(status)) {
                await this.promoteRegistrationToSpeaker(transaction, eventId, id, changedBy);
            }
            await transaction.commit();
            return mapRegistration(result.recordset[0]);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async approveRegistrationAsSpeaker(eventId, id, changedBy) {
        const registration = await this.findEventRegistration(eventId, id);
        if (!registration)
            return null;
        const nextStatus = registration.status === 'confirmed'
            ? 'confirmed'
            : 'accepted_pending_payment';
        return this.updateRegistrationStatus(eventId, id, nextStatus, changedBy, 'approved_as_speaker');
    }
    async keepRegistrationAsParticipant(eventId, id, changedBy) {
        const registration = await this.findEventRegistration(eventId, id);
        if (!registration)
            return null;
        const nextStatus = registration.status === 'confirmed'
            ? 'confirmed'
            : 'pending_payment';
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction
                .request()
                .input('id', mssql_1.default.UniqueIdentifier, id)
                .input('status', mssql_1.default.NVarChar(40), nextStatus)
                .query(`
          UPDATE dbo.event_registrations
          SET status = @status, updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
            await transaction
                .request()
                .input('registrationId', mssql_1.default.UniqueIdentifier, id)
                .input('fromStatus', mssql_1.default.NVarChar(40), registration.status)
                .input('toStatus', mssql_1.default.NVarChar(40), nextStatus)
                .input('changedBy', mssql_1.default.UniqueIdentifier, changedBy ?? null)
                .query(`
          INSERT INTO dbo.event_registration_status_history (
            registration_id, from_status, to_status, changed_by, reason
          )
          VALUES (
            @registrationId, @fromStatus, @toStatus, @changedBy, 'kept_as_participant'
          );

          UPDATE dbo.event_speakers
          SET deleted_at = SYSUTCDATETIME(), updated_by = @changedBy, updated_at = SYSUTCDATETIME()
          WHERE source_registration_id = @registrationId AND deleted_at IS NULL;
        `);
            await transaction.commit();
            return mapRegistration(result.recordset[0]);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async promoteRegistrationToSpeaker(transaction, eventId, registrationId, changedBy) {
        const source = await transaction
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .query(`
        SELECT TOP 1 p.email, p.first_name, p.last_name, p.phone, p.institution, p.professional_experience_json, response.answers_json
        FROM dbo.event_registrations r
        INNER JOIN dbo.participant_profiles p ON p.id = r.participant_profile_id
        LEFT JOIN dbo.event_registration_form_responses response ON response.registration_id = r.id
        WHERE r.event_id = @eventId AND r.id = @registrationId
      `);
        const row = source.recordset[0];
        if (!row)
            return;
        const answers = parseJson(row.answers_json ?? '{}', {});
        const answer = (...keys) => {
            const normalized = new Map(Object.entries(answers).map(([key, value]) => [key.toLowerCase(), value]));
            for (const key of keys) {
                const value = normalized.get(key.toLowerCase());
                if (typeof value === 'string' && value.trim())
                    return value.trim();
            }
            return null;
        };
        const possibleImageId = answer('photo', 'foto', 'fotografia', 'photograph', 'image', 'imageFileId', 'profilePhoto');
        const imageFileId = possibleImageId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(possibleImageId)
            ? possibleImageId
            : null;
        await transaction
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .input('name', mssql_1.default.NVarChar(180), `${row.first_name} ${row.last_name}`.trim())
            .input('role', mssql_1.default.NVarChar(180), answer('role', 'cargo', 'puesto', 'position'))
            .input('bio', mssql_1.default.NVarChar(mssql_1.default.MAX), answer('bio', 'biografia', 'resumen', 'abstract', 'semblanza'))
            .input('imageFileId', mssql_1.default.UniqueIdentifier, imageFileId)
            .input('email', mssql_1.default.NVarChar(180), row.email)
            .input('phone', mssql_1.default.NVarChar(80), row.phone)
            .input('organization', mssql_1.default.NVarChar(180), answer('organization', 'organizacion', 'institucion', 'institution') ?? row.institution)
            .input('websiteUrl', mssql_1.default.NVarChar(500), answer('website', 'websiteUrl', 'sitioWeb'))
            .input('socialUrl', mssql_1.default.NVarChar(500), answer('social', 'socialUrl', 'linkedin', 'perfilSocial'))
            .input('professionalExperienceJson', mssql_1.default.NVarChar(mssql_1.default.MAX), row.professional_experience_json ?? '[]')
            .input('userId', mssql_1.default.UniqueIdentifier, changedBy ?? null)
            .query(`
        IF EXISTS (SELECT 1 FROM dbo.event_speakers WHERE source_registration_id = @registrationId)
        BEGIN
          UPDATE dbo.event_speakers
          SET name = @name, role = @role, bio = @bio, image_file_id = COALESCE(@imageFileId, image_file_id),
              email = @email, phone = @phone, organization = @organization, website_url = @websiteUrl,
              social_url = @socialUrl, professional_experience_json = @professionalExperienceJson, status = 'published', deleted_at = NULL, updated_by = @userId,
              updated_at = SYSUTCDATETIME()
          WHERE source_registration_id = @registrationId;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.event_speakers (
            event_id, source_registration_id, name, role, bio, image_file_id, email, phone,
            organization, website_url, social_url, professional_experience_json, status, created_by, updated_by
          )
          VALUES (
            @eventId, @registrationId, @name, @role, @bio, @imageFileId, @email, @phone,
            @organization, @websiteUrl, @socialUrl, @professionalExperienceJson, 'published', @userId, @userId
          );
        END
      `);
    }
    async listEventMaterials(eventId, includeRestricted = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('includeRestricted', mssql_1.default.Bit, includeRestricted)
            .query(`
        SELECT m.id, m.event_id AS eventId, m.file_id AS fileId, m.program_id AS programId,
          p.name AS programName, m.title, m.description, m.material_type AS materialType,
          m.visibility, m.registration_type_id AS registrationTypeId, m.is_active AS isActive,
          m.sort_order AS sortOrder, f.original_name AS originalName, f.mime_type AS mimeType,
          f.size_bytes AS sizeBytes
        FROM dbo.event_materials m
        INNER JOIN dbo.files f ON f.id = m.file_id
        LEFT JOIN dbo.event_programs p ON p.id = m.program_id
        WHERE m.event_id = @eventId
          AND m.is_active = 1
          AND (@includeRestricted = 1 OR m.visibility = 'public')
        ORDER BY COALESCE(p.sort_order, 0) ASC, m.sort_order ASC, m.created_at ASC
      `);
        return result.recordset;
    }
    async listEventMaterialsForParticipant(eventId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT DISTINCT m.id, m.event_id AS eventId, m.file_id AS fileId, m.program_id AS programId,
          p.name AS programName, m.title, m.description, m.material_type AS materialType,
          m.visibility, m.registration_type_id AS registrationTypeId, m.is_active AS isActive,
          m.sort_order AS sortOrder, f.original_name AS originalName, f.mime_type AS mimeType,
          f.size_bytes AS sizeBytes
        FROM dbo.event_materials m
        INNER JOIN dbo.files f ON f.id = m.file_id
        LEFT JOIN dbo.event_programs p ON p.id = m.program_id
        WHERE m.event_id = @eventId
          AND m.is_active = 1
          AND EXISTS (
            SELECT 1
            FROM dbo.event_registrations r
            WHERE r.event_id = m.event_id
              AND r.user_id = @userId
              AND r.status <> 'cancelled'
              AND (m.program_id IS NULL OR m.program_id = r.program_id)
              AND (
                m.visibility = 'public'
                OR (
                  m.visibility = 'registered'
                  AND EXISTS (
                    SELECT 1
                    FROM dbo.payment_orders po
                    WHERE po.registration_id = r.id
                      AND po.status = 'paid'
                  )
                )
                OR (
                  m.visibility = 'registration_type'
                  AND m.registration_type_id = r.registration_type_id
                  AND EXISTS (
                    SELECT 1
                    FROM dbo.payment_orders po
                    WHERE po.registration_id = r.id
                      AND po.status = 'paid'
                  )
                )
              )
          )
        ORDER BY programName ASC, sortOrder ASC
      `);
        return result.recordset;
    }
    async createEventMaterial(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('fileId', mssql_1.default.UniqueIdentifier, input.fileId)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('title', mssql_1.default.NVarChar(180), input.title)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('materialType', mssql_1.default.NVarChar(80), input.materialType ?? 'other')
            .input('visibility', mssql_1.default.NVarChar(40), input.visibility ?? 'public')
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
            .query(`
        INSERT INTO dbo.event_materials (
          event_id, file_id, program_id, title, description, material_type, visibility, registration_type_id, is_active, sort_order, created_by
        )
        OUTPUT INSERTED.id, INSERTED.event_id AS eventId, INSERTED.file_id AS fileId, INSERTED.program_id AS programId,
          INSERTED.title, INSERTED.description, INSERTED.material_type AS materialType, INSERTED.visibility, INSERTED.registration_type_id AS registrationTypeId,
          INSERTED.is_active AS isActive, INSERTED.sort_order AS sortOrder
        VALUES (@eventId, @fileId, @programId, @title, @description, @materialType, @visibility, @registrationTypeId, @isActive, @sortOrder, @userId)
      `);
        return result.recordset[0];
    }
    async updateEventMaterial(eventId, materialId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('materialId', mssql_1.default.UniqueIdentifier, materialId)
            .input('fileId', mssql_1.default.UniqueIdentifier, input.fileId ?? null)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('updateProgramId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'programId'))
            .input('title', mssql_1.default.NVarChar(180), input.title ?? null)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('updateDescription', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'description'))
            .input('materialType', mssql_1.default.NVarChar(80), input.materialType ?? null)
            .input('visibility', mssql_1.default.NVarChar(40), input.visibility ?? null)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('updateRegistrationTypeId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'registrationTypeId'))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .query(`
        UPDATE dbo.event_materials
        SET file_id = COALESCE(@fileId, file_id),
            program_id = CASE WHEN @updateProgramId = 1 THEN @programId ELSE program_id END,
            title = COALESCE(@title, title),
            description = CASE WHEN @updateDescription = 1 THEN @description ELSE description END,
            material_type = COALESCE(@materialType, material_type),
            visibility = COALESCE(@visibility, visibility),
            registration_type_id = CASE WHEN @updateRegistrationTypeId = 1 THEN @registrationTypeId ELSE registration_type_id END,
            is_active = COALESCE(@isActive, is_active),
            sort_order = COALESCE(@sortOrder, sort_order),
            updated_at = SYSUTCDATETIME()
        WHERE id = @materialId AND event_id = @eventId;

        SELECT m.id, m.event_id AS eventId, m.file_id AS fileId, m.program_id AS programId,
          p.name AS programName, m.title, m.description, m.material_type AS materialType,
          m.visibility, m.registration_type_id AS registrationTypeId, m.is_active AS isActive,
          m.sort_order AS sortOrder, f.original_name AS originalName, f.mime_type AS mimeType,
          f.size_bytes AS sizeBytes
        FROM dbo.event_materials m
        INNER JOIN dbo.files f ON f.id = m.file_id
        LEFT JOIN dbo.event_programs p ON p.id = m.program_id
        WHERE m.id = @materialId AND m.event_id = @eventId;
      `);
        return result.recordset[0] ?? null;
    }
    async deactivateEventMaterial(eventId, materialId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('materialId', mssql_1.default.UniqueIdentifier, materialId)
            .query(`
        UPDATE dbo.event_materials
        SET is_active = 0
        WHERE id = @materialId AND event_id = @eventId;
        SELECT @@ROWCOUNT AS affected;
      `);
        return (result.recordset[0]?.affected ?? 0) > 0;
    }
    async getTeamCertificateSettings(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT max_advisors_per_team AS maxAdvisors,
          max_team_members_per_team AS maxTeamMembers,
          certificate_delay_minutes AS certificateDelayMinutes
        FROM dbo.event_settings WHERE event_id = @eventId
      `);
        return result.recordset[0] ?? { maxAdvisors: 2, maxTeamMembers: 2, certificateDelayMinutes: 60 };
    }
    async updateTeamCertificateSettings(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('maxAdvisors', mssql_1.default.Int, input.maxAdvisors)
            .input('maxTeamMembers', mssql_1.default.Int, input.maxTeamMembers)
            .input('certificateDelayMinutes', mssql_1.default.Int, input.certificateDelayMinutes)
            .query(`
        MERGE dbo.event_settings AS target
        USING (SELECT @eventId AS event_id) AS source ON target.event_id = source.event_id
        WHEN MATCHED THEN UPDATE SET
          max_advisors_per_team = @maxAdvisors,
          max_team_members_per_team = @maxTeamMembers,
          certificate_delay_minutes = @certificateDelayMinutes
        WHEN NOT MATCHED THEN INSERT (
          event_id, default_currency, max_advisors_per_team, max_team_members_per_team, certificate_delay_minutes
        ) VALUES (@eventId, 'MXN', @maxAdvisors, @maxTeamMembers, @certificateDelayMinutes);
      `);
        return input;
    }
    async issueDueCertificates() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query(`
      DECLARE @issued INT = 0;

      INSERT INTO dbo.event_certificates (
        event_id, registration_id, template_id, certificate_code, recipient_name,
        recipient_email, recipient_role, available_at, issued_at
      )
      SELECT template.event_id, registration.id, template.id,
        CONCAT('SYSEVENTS-', UPPER(LEFT(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), 20))),
        CONCAT(profile.first_name, ' ', profile.last_name), profile.email, template.target_role,
        DATEADD(MINUTE, settings.certificate_delay_minutes, COALESCE(agenda.ends_at, agenda.starts_at)), SYSUTCDATETIME()
      FROM dbo.event_certificate_templates template
      INNER JOIN dbo.event_agenda_items agenda ON agenda.id = template.agenda_item_id AND agenda.event_id = template.event_id
      INNER JOIN dbo.event_settings settings ON settings.event_id = template.event_id
      INNER JOIN dbo.event_registrations registration ON registration.event_id = template.event_id
        AND (template.program_id IS NULL OR template.program_id = registration.program_id)
        AND (template.registration_type_id IS NULL OR template.registration_type_id = registration.registration_type_id)
      INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
      LEFT JOIN dbo.event_speakers speaker ON speaker.source_registration_id = registration.id AND speaker.deleted_at IS NULL
      WHERE template.deleted_at IS NULL AND template.is_active = 1 AND template.auto_issue = 1
        AND template.target_role IN ('participant','speaker','keynote_speaker')
        AND registration.status IN ('confirmed','checked_in')
        AND DATEADD(MINUTE, settings.certificate_delay_minutes, COALESCE(agenda.ends_at, agenda.starts_at)) <= SYSUTCDATETIME()
        AND (template.target_role = 'participant'
          OR (template.target_role = 'speaker' AND speaker.id IS NOT NULL)
          OR (template.target_role = 'keynote_speaker' AND speaker.id IS NOT NULL
            AND (LOWER(COALESCE(agenda.speaker_role, '')) LIKE '%magistral%'
              OR LOWER(COALESCE(agenda.speaker_role, '')) LIKE '%keynote%')))
        AND (agenda.speaker_email IS NULL OR template.target_role = 'participant' OR LOWER(agenda.speaker_email) = LOWER(profile.email))
        AND (agenda.speaker_id IS NULL OR template.target_role = 'participant' OR agenda.speaker_id = speaker.id)
        AND NOT EXISTS (
          SELECT 1 FROM dbo.event_certificates certificate
          WHERE certificate.registration_id = registration.id AND certificate.template_id = template.id
            AND certificate.recipient_role = template.target_role AND certificate.recipient_email = profile.email
        );
      SET @issued += @@ROWCOUNT;

      INSERT INTO dbo.event_certificates (
        event_id, registration_id, template_id, certificate_code, recipient_name,
        recipient_email, recipient_role, available_at, issued_at
      )
      SELECT template.event_id, registration.id, template.id,
        CONCAT('SYSEVENTS-', UPPER(LEFT(REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''), 20))),
        member.full_name, member.email, template.target_role,
        DATEADD(MINUTE, settings.certificate_delay_minutes, COALESCE(agenda.ends_at, agenda.starts_at)), SYSUTCDATETIME()
      FROM dbo.event_certificate_templates template
      INNER JOIN dbo.event_agenda_items agenda ON agenda.id = template.agenda_item_id AND agenda.event_id = template.event_id
      INNER JOIN dbo.event_settings settings ON settings.event_id = template.event_id
      INNER JOIN dbo.event_registrations registration ON registration.event_id = template.event_id
        AND (template.program_id IS NULL OR template.program_id = registration.program_id)
        AND (template.registration_type_id IS NULL OR template.registration_type_id = registration.registration_type_id)
      INNER JOIN dbo.event_registration_team_members member ON member.registration_id = registration.id
        AND member.role = CASE WHEN template.target_role = 'advisor' THEN 'advisor' ELSE 'team_member' END
      INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
      LEFT JOIN dbo.event_speakers speaker ON speaker.source_registration_id = registration.id AND speaker.deleted_at IS NULL
      WHERE template.deleted_at IS NULL AND template.is_active = 1 AND template.auto_issue = 1
        AND template.target_role IN ('advisor','team_member')
        AND registration.status IN ('confirmed','checked_in')
        AND DATEADD(MINUTE, settings.certificate_delay_minutes, COALESCE(agenda.ends_at, agenda.starts_at)) <= SYSUTCDATETIME()
        AND (agenda.speaker_email IS NULL OR LOWER(agenda.speaker_email) = LOWER(profile.email))
        AND (agenda.speaker_id IS NULL OR agenda.speaker_id = speaker.id)
        AND NOT EXISTS (
          SELECT 1 FROM dbo.event_certificates certificate
          WHERE certificate.registration_id = registration.id AND certificate.template_id = template.id
            AND certificate.recipient_role = template.target_role AND certificate.recipient_email = member.email
        );
      SET @issued += @@ROWCOUNT;
      SELECT @issued AS issued;
    `);
        return result.recordset[0]?.issued ?? 0;
    }
    async listCertificateTemplates(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT template.id, template.event_id AS eventId, template.registration_type_id AS registrationTypeId,
          template.program_id AS programId, program.name AS programName, template.background_file_id AS backgroundFileId,
          template.agenda_item_id AS agendaItemId, agenda.title AS agendaItemTitle,
          file_record.original_name AS backgroundOriginalName, file_record.mime_type AS backgroundMimeType,
          template.name, template.certificate_type AS certificateType, template.target_role AS targetRole,
          template.recipient_source AS recipientSource, template.content_json AS contentJson,
          template.is_active AS isActive, template.auto_issue AS autoIssue, template.sort_order AS sortOrder
        FROM dbo.event_certificate_templates template
        LEFT JOIN dbo.event_programs program ON program.id = template.program_id
        LEFT JOIN dbo.files file_record ON file_record.id = template.background_file_id
        LEFT JOIN dbo.event_agenda_items agenda ON agenda.id = template.agenda_item_id
        WHERE template.event_id = @eventId AND template.deleted_at IS NULL
        ORDER BY template.sort_order ASC, template.created_at DESC
      `);
        return result.recordset.map((row) => ({ ...row, content: parseJson(row.contentJson, {}) }));
    }
    async createCertificateTemplate(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('backgroundFileId', mssql_1.default.UniqueIdentifier, input.backgroundFileId ?? null)
            .input('agendaItemId', mssql_1.default.UniqueIdentifier, input.agendaItemId ?? null)
            .input('name', mssql_1.default.NVarChar(160), input.name)
            .input('certificateType', mssql_1.default.NVarChar(60), input.certificateType ?? 'participant')
            .input('targetRole', mssql_1.default.NVarChar(40), input.targetRole ?? input.certificateType ?? 'participant')
            .input('recipientSource', mssql_1.default.NVarChar(40), input.recipientSource ?? 'registration')
            .input('contentJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.content ?? {}))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('autoIssue', mssql_1.default.Bit, input.autoIssue ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
            .query(`
        INSERT INTO dbo.event_certificate_templates (
          event_id, registration_type_id, program_id, background_file_id, agenda_item_id, name, certificate_type,
          target_role, recipient_source, content_json, is_active, auto_issue, sort_order, created_by
        )
        OUTPUT INSERTED.id, INSERTED.event_id AS eventId, INSERTED.registration_type_id AS registrationTypeId,
          INSERTED.program_id AS programId, INSERTED.background_file_id AS backgroundFileId, INSERTED.agenda_item_id AS agendaItemId,
          INSERTED.name, INSERTED.certificate_type AS certificateType, INSERTED.target_role AS targetRole,
          INSERTED.recipient_source AS recipientSource, INSERTED.content_json AS contentJson,
          INSERTED.is_active AS isActive, INSERTED.auto_issue AS autoIssue, INSERTED.sort_order AS sortOrder
        VALUES (
          @eventId, @registrationTypeId, @programId, @backgroundFileId, @agendaItemId, @name, @certificateType,
          @targetRole, @recipientSource, @contentJson, @isActive, @autoIssue, @sortOrder, @userId
        )
      `);
        const row = result.recordset[0];
        return { ...row, content: parseJson(row.contentJson, {}) };
    }
    async updateCertificateTemplate(eventId, templateId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('templateId', mssql_1.default.UniqueIdentifier, templateId)
            .input('registrationTypeId', mssql_1.default.UniqueIdentifier, input.registrationTypeId ?? null)
            .input('updateRegistrationTypeId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'registrationTypeId'))
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('updateProgramId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'programId'))
            .input('backgroundFileId', mssql_1.default.UniqueIdentifier, input.backgroundFileId ?? null)
            .input('updateBackgroundFileId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'backgroundFileId'))
            .input('agendaItemId', mssql_1.default.UniqueIdentifier, input.agendaItemId ?? null)
            .input('updateAgendaItemId', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'agendaItemId'))
            .input('name', mssql_1.default.NVarChar(160), input.name ?? null)
            .input('certificateType', mssql_1.default.NVarChar(60), input.certificateType ?? null)
            .input('targetRole', mssql_1.default.NVarChar(40), input.targetRole ?? null)
            .input('recipientSource', mssql_1.default.NVarChar(40), input.recipientSource ?? null)
            .input('contentJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.content === undefined ? null : JSON.stringify(input.content))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .input('autoIssue', mssql_1.default.Bit, input.autoIssue ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .query(`
        UPDATE dbo.event_certificate_templates
        SET registration_type_id = CASE WHEN @updateRegistrationTypeId = 1 THEN @registrationTypeId ELSE registration_type_id END,
            program_id = CASE WHEN @updateProgramId = 1 THEN @programId ELSE program_id END,
            background_file_id = CASE WHEN @updateBackgroundFileId = 1 THEN @backgroundFileId ELSE background_file_id END,
            agenda_item_id = CASE WHEN @updateAgendaItemId = 1 THEN @agendaItemId ELSE agenda_item_id END,
            name = COALESCE(@name, name),
            certificate_type = COALESCE(@certificateType, certificate_type),
            target_role = COALESCE(@targetRole, target_role),
            recipient_source = COALESCE(@recipientSource, recipient_source),
            content_json = COALESCE(@contentJson, content_json),
            is_active = COALESCE(@isActive, is_active),
            auto_issue = COALESCE(@autoIssue, auto_issue),
            sort_order = COALESCE(@sortOrder, sort_order),
            updated_at = SYSUTCDATETIME()
        WHERE id = @templateId AND event_id = @eventId AND deleted_at IS NULL;

        SELECT template.id, template.event_id AS eventId, template.registration_type_id AS registrationTypeId,
          template.program_id AS programId, program.name AS programName, template.background_file_id AS backgroundFileId,
          template.agenda_item_id AS agendaItemId, agenda.title AS agendaItemTitle,
          file_record.original_name AS backgroundOriginalName, file_record.mime_type AS backgroundMimeType,
          template.name, template.certificate_type AS certificateType, template.target_role AS targetRole,
          template.recipient_source AS recipientSource, template.content_json AS contentJson,
          template.is_active AS isActive, template.auto_issue AS autoIssue, template.sort_order AS sortOrder
        FROM dbo.event_certificate_templates template
        LEFT JOIN dbo.event_programs program ON program.id = template.program_id
        LEFT JOIN dbo.files file_record ON file_record.id = template.background_file_id
        LEFT JOIN dbo.event_agenda_items agenda ON agenda.id = template.agenda_item_id
        WHERE template.id = @templateId AND template.event_id = @eventId AND template.deleted_at IS NULL;
      `);
        const row = result.recordset[0];
        return row ? { ...row, content: parseJson(row.contentJson, {}) } : null;
    }
    async deleteCertificateTemplate(eventId, templateId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('templateId', mssql_1.default.UniqueIdentifier, templateId)
            .query(`
        UPDATE dbo.event_certificate_templates
        SET deleted_at = SYSUTCDATETIME(), is_active = 0, updated_at = SYSUTCDATETIME()
        WHERE id = @templateId AND event_id = @eventId AND deleted_at IS NULL;
        SELECT @@ROWCOUNT AS affected;
      `);
        return (result.recordset[0]?.affected ?? 0) > 0;
    }
    async issueCertificate(eventId, templateId, registrationId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const eligibility = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('templateId', mssql_1.default.UniqueIdentifier, templateId)
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .query(`
        SELECT TOP 1 registration.status, template.target_role, template.recipient_source,
          CAST(CASE WHEN speaker.id IS NULL THEN 0 ELSE 1 END AS BIT) AS is_speaker,
          CONCAT(profile.first_name, ' ', profile.last_name) AS recipient_name, profile.email AS recipient_email
        FROM dbo.event_registrations registration
        INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
        INNER JOIN dbo.event_certificate_templates template
          ON template.id = @templateId AND template.event_id = registration.event_id
        LEFT JOIN dbo.event_speakers speaker
          ON speaker.source_registration_id = registration.id AND speaker.deleted_at IS NULL
        WHERE registration.event_id = @eventId
          AND registration.id = @registrationId
          AND template.deleted_at IS NULL
          AND template.is_active = 1
          AND (template.program_id IS NULL OR template.program_id = registration.program_id)
          AND (template.registration_type_id IS NULL OR template.registration_type_id = registration.registration_type_id)
      `);
        const eligible = eligibility.recordset[0];
        if (!eligible) {
            throw new app_error_1.AppError('Registration or certificate template not found', 404, 'CERTIFICATE_NOT_FOUND');
        }
        if (!['confirmed', 'checked_in'].includes(eligible.status)) {
            throw new app_error_1.AppError('Certificate requires a confirmed payment', 409, 'PAYMENT_REQUIRED_FOR_CERTIFICATE');
        }
        if ((eligible.target_role === 'speaker' || eligible.recipient_source === 'speaker') && !eligible.is_speaker) {
            throw new app_error_1.AppError('Speaker certificate requires an approved speaker', 409, 'SPEAKER_APPROVAL_REQUIRED');
        }
        if (['team_advisor', 'team_member'].includes(eligible.recipient_source)) {
            throw new app_error_1.AppError('Las constancias del equipo se generan automáticamente desde los integrantes registrados.', 409, 'TEAM_CERTIFICATE_AUTO_ISSUANCE_REQUIRED');
        }
        const code = `SYSEVENTS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('templateId', mssql_1.default.UniqueIdentifier, templateId)
            .input('registrationId', mssql_1.default.UniqueIdentifier, registrationId)
            .input('certificateCode', mssql_1.default.NVarChar(80), code)
            .input('recipientName', mssql_1.default.NVarChar(240), eligible.recipient_name)
            .input('recipientEmail', mssql_1.default.NVarChar(255), eligible.recipient_email)
            .input('recipientRole', mssql_1.default.NVarChar(40), eligible.target_role)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        INSERT INTO dbo.event_certificates (
          event_id, registration_id, template_id, certificate_code, recipient_name,
          recipient_email, recipient_role, available_at, issued_by
        )
        OUTPUT INSERTED.id, INSERTED.event_id AS eventId, INSERTED.registration_id AS registrationId,
          INSERTED.template_id AS templateId, INSERTED.certificate_code AS certificateCode,
          INSERTED.status, INSERTED.issued_at AS issuedAt
        VALUES (
          @eventId, @registrationId, @templateId, @certificateCode, @recipientName,
          @recipientEmail, @recipientRole, SYSUTCDATETIME(), @userId
        )
      `);
        return result.recordset[0];
    }
}
exports.RegistrationsRepository = RegistrationsRepository;
//# sourceMappingURL=registrations.repository.js.map