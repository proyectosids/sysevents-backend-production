"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteDataRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
const secrets_1 = require("../../../../shared/security/secrets");
function iso(value) {
    return value ? new Date(value).toISOString() : null;
}
function parseJson(value) {
    try {
        return value ? JSON.parse(value) : {};
    }
    catch {
        return {};
    }
}
function mapAgendaDay(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        label: row.label,
        dateLabel: row.date_label,
        startsAt: iso(row.starts_at),
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapAgendaItem(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        dayId: row.day_id,
        speakerId: row.speaker_id,
        title: row.title,
        description: row.description,
        startsAt: iso(row.starts_at),
        endsAt: iso(row.ends_at),
        timeLabel: row.time_label,
        speaker: row.linked_speaker_name ?? row.speaker,
        speakerRole: row.linked_speaker_role ?? row.speaker_role,
        speakerImageFileId: row.linked_speaker_image_file_id ?? row.speaker_image_file_id,
        speakerEmail: row.linked_speaker_email ?? row.speaker_email,
        location: row.location,
        track: row.track,
        actionLabel: row.action_label,
        actionUrl: row.action_url,
        imageFileId: row.image_file_id,
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapTestimonial(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        authorName: row.author_name,
        authorRole: row.author_role,
        quote: row.quote,
        imageFileId: row.image_file_id,
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapSpeaker(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        sourceRegistrationId: row.source_registration_id ?? null,
        programId: row.program_id ?? null,
        programName: row.program_name ?? null,
        name: row.name,
        role: row.role,
        bio: row.bio,
        imageFileId: row.image_file_id,
        email: row.email,
        phone: row.phone,
        organization: row.organization,
        websiteUrl: row.website_url,
        socialUrl: row.social_url,
        professionalExperience: parseJson(row.professional_experience_json ?? '[]'),
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapFaq(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        question: row.question,
        answer: row.answer,
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapSponsor(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        tier: row.tier,
        url: row.url,
        logoFileId: row.logo_file_id,
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapProviderSummary(row) {
    const metadata = parseJson(row.metadata_json);
    return {
        id: row.id,
        eventId: row.event_id,
        provider: row.provider,
        mode: row.mode,
        isActive: row.is_active,
        isDefault: Boolean(row.is_default),
        publicKey: row.public_key,
        openpayPublicKey: typeof metadata.openpayPublicKey === 'string' ? metadata.openpayPublicKey : null,
        openpayApiUrl: typeof metadata.openpayApiUrl === 'string' ? metadata.openpayApiUrl : null,
        secretLast4: typeof metadata.secretLast4 === 'string' ? metadata.secretLast4 : null,
        webhookSecretLast4: typeof metadata.webhookSecretLast4 === 'string' ? metadata.webhookSecretLast4 : null,
        updatedAt: iso(row.updated_at),
    };
}
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        || 'programa';
}
function mapProgram(row) {
    const settings = parseJson(row.settings_json);
    const fullSubmissionType = settings.fullSubmissionType === 'video_url'
        ? 'video_url'
        : settings.fullSubmissionType === 'none'
            ? 'none'
            : 'file';
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        description: row.description,
        slug: row.slug,
        isActive: row.is_active,
        sortOrder: row.sort_order,
        fullSubmissionType,
        settings,
    };
}
function mapKnowledgeArea(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        sortOrder: row.sort_order,
    };
}
function mapKnowledgeLine(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        areaId: row.area_id,
        areaName: row.area_name ?? null,
        name: row.name,
        description: row.description,
        isActive: row.is_active,
        sortOrder: row.sort_order,
    };
}
class SiteDataRepository {
    async publicBundle(eventId) {
        const [programs, knowledgeAreas, knowledgeLines, agendaDays, agendaItems, testimonials, speakers, faqs, sponsors, paymentPolicy] = await Promise.all([
            this.listPrograms(eventId, true),
            this.listKnowledgeAreas(eventId, true),
            this.listKnowledgeLines(eventId, true),
            this.listAgendaDays(eventId, true),
            this.listAgendaItems(eventId, true),
            this.listTestimonials(eventId, true),
            this.listSpeakers(eventId, true),
            this.listFaqs(eventId, true),
            this.listSponsors(eventId, true),
            this.getPaymentPolicy(eventId),
        ]);
        return { programs, knowledgeAreas, knowledgeLines, agendaDays, agendaItems, testimonials, speakers, faqs, sponsors, paymentPolicy };
    }
    async listPrograms(eventId, onlyActive = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyActive', mssql_1.default.Bit, onlyActive)
            .query(`
        SELECT * FROM dbo.event_programs
        WHERE event_id = @eventId AND deleted_at IS NULL AND (@onlyActive = 0 OR is_active = 1)
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset.map(mapProgram);
    }
    async createProgram(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const settings = { ...(input.settings ?? {}), fullSubmissionType: input.fullSubmissionType ?? input.settings?.fullSubmissionType ?? 'file' };
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('name', mssql_1.default.NVarChar(160), input.name)
            .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
            .input('slug', mssql_1.default.NVarChar(180), input.slug ?? slugify(input.name))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('settingsJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(settings))
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_programs (event_id, name, description, slug, is_active, sort_order, settings_json, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @name, @description, @slug, @isActive, @sortOrder, @settingsJson, @userId, @userId)
      `);
        return mapProgram(result.recordset[0]);
    }
    async updateProgram(eventId, id, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const hasFullSubmissionType = Object.prototype.hasOwnProperty.call(input, 'fullSubmissionType');
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar(160), input.name ?? null)
            .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
            .input('descriptionProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'description'))
            .input('slug', mssql_1.default.NVarChar(180), input.slug ?? (input.name ? slugify(input.name) : null))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .input('settingsJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.settings ? JSON.stringify(input.settings) : null)
            .input('settingsProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'settings'))
            .input('fullSubmissionType', mssql_1.default.NVarChar(20), input.fullSubmissionType ?? null)
            .input('fullSubmissionTypeProvided', mssql_1.default.Bit, hasFullSubmissionType)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        UPDATE dbo.event_programs
        SET name = COALESCE(@name, name),
          description = CASE WHEN @descriptionProvided = 1 THEN @description ELSE description END,
          slug = COALESCE(@slug, slug),
          is_active = COALESCE(@isActive, is_active),
          sort_order = COALESCE(@sortOrder, sort_order),
          settings_json = CASE
            WHEN @settingsProvided = 1 THEN @settingsJson
            WHEN @fullSubmissionTypeProvided = 1 THEN JSON_MODIFY(COALESCE(NULLIF(settings_json, ''), '{}'), '$.fullSubmissionType', @fullSubmissionType)
            ELSE settings_json
          END,
          updated_by = COALESCE(@userId, updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND event_id = @eventId AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapProgram(result.recordset[0]) : null;
    }
    async deleteProgram(eventId, id, userId) {
        await this.softDelete('event_programs', eventId, id, userId);
    }
    async listKnowledgeAreas(eventId, onlyActive = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyActive', mssql_1.default.Bit, onlyActive)
            .query(`
        SELECT * FROM dbo.event_knowledge_areas
        WHERE event_id = @eventId AND deleted_at IS NULL AND (@onlyActive = 0 OR is_active = 1)
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset.map(mapKnowledgeArea);
    }
    async createKnowledgeArea(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('name', mssql_1.default.NVarChar(180), input.name)
            .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_knowledge_areas (event_id, name, description, is_active, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @name, @description, @isActive, @sortOrder, @userId, @userId)
      `);
        return mapKnowledgeArea(result.recordset[0]);
    }
    async updateKnowledgeArea(eventId, id, input, userId) {
        const updated = await this.updateGeneric(eventId, id, input, userId, 'event_knowledge_areas', {
            name: 'name',
            description: 'description',
            isActive: 'is_active',
            sortOrder: 'sort_order',
        });
        return updated ? mapKnowledgeArea(updated) : null;
    }
    async deleteKnowledgeArea(eventId, id, userId) {
        await this.softDelete('event_knowledge_areas', eventId, id, userId);
    }
    async listKnowledgeLines(eventId, onlyActive = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyActive', mssql_1.default.Bit, onlyActive)
            .query(`
        SELECT line.*, area.name AS area_name
        FROM dbo.event_knowledge_lines line
        LEFT JOIN dbo.event_knowledge_areas area ON area.id = line.area_id
        WHERE line.event_id = @eventId AND line.deleted_at IS NULL AND (@onlyActive = 0 OR line.is_active = 1)
        ORDER BY COALESCE(area.sort_order, 9999) ASC, line.sort_order ASC, line.created_at ASC
      `);
        return result.recordset.map(mapKnowledgeLine);
    }
    async createKnowledgeLine(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('areaId', mssql_1.default.UniqueIdentifier, input.areaId ?? null)
            .input('name', mssql_1.default.NVarChar(220), input.name)
            .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_knowledge_lines (event_id, area_id, name, description, is_active, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*, NULL AS area_name
        VALUES (@eventId, @areaId, @name, @description, @isActive, @sortOrder, @userId, @userId)
      `);
        return mapKnowledgeLine(result.recordset[0]);
    }
    async updateKnowledgeLine(eventId, id, input, userId) {
        const updated = await this.updateGeneric(eventId, id, input, userId, 'event_knowledge_lines', {
            areaId: 'area_id',
            name: 'name',
            description: 'description',
            isActive: 'is_active',
            sortOrder: 'sort_order',
        });
        return updated ? mapKnowledgeLine(updated) : null;
    }
    async deleteKnowledgeLine(eventId, id, userId) {
        await this.softDelete('event_knowledge_lines', eventId, id, userId);
    }
    async listAgendaDays(eventId, onlyPublished = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished)
            .query(`
        SELECT * FROM dbo.event_agenda_days
        WHERE event_id = @eventId AND deleted_at IS NULL AND (@onlyPublished = 0 OR status = 'published')
        ORDER BY
          CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END ASC,
          starts_at ASC,
          sort_order ASC,
          created_at ASC
      `);
        return result.recordset.map(mapAgendaDay);
    }
    async createAgendaDay(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('label', mssql_1.default.NVarChar(120), input.label)
            .input('dateLabel', mssql_1.default.NVarChar(120), input.dateLabel ?? null)
            .input('startsAt', mssql_1.default.DateTime2, input.startsAt ? new Date(input.startsAt) : null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'published')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_agenda_days (event_id, label, date_label, starts_at, status, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @label, @dateLabel, @startsAt, @status, @sortOrder, @userId, @userId)
      `);
        return mapAgendaDay(result.recordset[0]);
    }
    async updateAgendaDay(eventId, id, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('label', mssql_1.default.NVarChar(120), input.label ?? null)
            .input('dateLabel', mssql_1.default.NVarChar(120), input.dateLabel ?? null)
            .input('dateLabelProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'dateLabel'))
            .input('startsAt', mssql_1.default.DateTime2, input.startsAt ? new Date(input.startsAt) : null)
            .input('startsAtProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'startsAt'))
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        UPDATE dbo.event_agenda_days
        SET label = COALESCE(@label, label),
          date_label = CASE WHEN @dateLabelProvided = 1 THEN @dateLabel ELSE date_label END,
          starts_at = CASE WHEN @startsAtProvided = 1 THEN @startsAt ELSE starts_at END,
          status = COALESCE(@status, status),
          sort_order = COALESCE(@sortOrder, sort_order),
          updated_by = COALESCE(@userId, updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND event_id = @eventId AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapAgendaDay(result.recordset[0]) : null;
    }
    async deleteAgendaDay(eventId, id, userId) {
        await this.softDelete('event_agenda_days', eventId, id, userId);
    }
    async listAgendaItems(eventId, onlyPublished = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished)
            .query(`
        SELECT ai.*,
          sp.name AS linked_speaker_name,
          sp.role AS linked_speaker_role,
          sp.image_file_id AS linked_speaker_image_file_id,
          sp.email AS linked_speaker_email
        FROM dbo.event_agenda_items ai
        LEFT JOIN dbo.event_speakers sp
          ON sp.id = ai.speaker_id
          AND sp.event_id = ai.event_id
          AND sp.deleted_at IS NULL
          AND (@onlyPublished = 0 OR sp.status = 'published')
        WHERE ai.event_id = @eventId AND ai.deleted_at IS NULL AND (@onlyPublished = 0 OR ai.status = 'published')
        ORDER BY
          CASE WHEN ai.starts_at IS NULL THEN 1 ELSE 0 END ASC,
          ai.starts_at ASC,
          ai.sort_order ASC,
          ai.created_at ASC
      `);
        return result.recordset.map(mapAgendaItem);
    }
    async createAgendaItem(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('dayId', mssql_1.default.UniqueIdentifier, input.dayId ?? null)
            .input('speakerId', mssql_1.default.UniqueIdentifier, input.speakerId ?? null)
            .input('title', mssql_1.default.NVarChar(220), input.title)
            .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
            .input('startsAt', mssql_1.default.DateTime2, input.startsAt ? new Date(input.startsAt) : null)
            .input('endsAt', mssql_1.default.DateTime2, input.endsAt ? new Date(input.endsAt) : null)
            .input('timeLabel', mssql_1.default.NVarChar(120), input.timeLabel ?? null)
            .input('speaker', mssql_1.default.NVarChar(180), input.speaker ?? null)
            .input('speakerRole', mssql_1.default.NVarChar(180), input.speakerRole ?? null)
            .input('speakerImageFileId', mssql_1.default.UniqueIdentifier, input.speakerImageFileId ?? null)
            .input('speakerEmail', mssql_1.default.NVarChar(180), input.speakerEmail ?? null)
            .input('location', mssql_1.default.NVarChar(180), input.location ?? null)
            .input('track', mssql_1.default.NVarChar(180), input.track ?? null)
            .input('actionLabel', mssql_1.default.NVarChar(120), input.actionLabel ?? null)
            .input('actionUrl', mssql_1.default.NVarChar(500), input.actionUrl ?? null)
            .input('imageFileId', mssql_1.default.UniqueIdentifier, input.imageFileId ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'published')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_agenda_items (event_id, day_id, speaker_id, title, description, starts_at, ends_at, time_label, speaker, speaker_role, speaker_image_file_id, speaker_email, location, track, action_label, action_url, image_file_id, status, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @dayId, @speakerId, @title, @description, @startsAt, @endsAt, @timeLabel, @speaker, @speakerRole, @speakerImageFileId, @speakerEmail, @location, @track, @actionLabel, @actionUrl, @imageFileId, @status, @sortOrder, @userId, @userId)
      `);
        return mapAgendaItem(result.recordset[0]);
    }
    async updateAgendaItem(eventId, id, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('json', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input))
            .input('speakerIdProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'speakerId'))
            .input('speakerId', mssql_1.default.UniqueIdentifier, input.speakerId ?? null)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        DECLARE @payload NVARCHAR(MAX) = @json;
        UPDATE dbo.event_agenda_items
        SET day_id = CASE WHEN JSON_VALUE(@payload, '$.dayId') IS NOT NULL THEN TRY_CONVERT(uniqueidentifier, JSON_VALUE(@payload, '$.dayId')) ELSE day_id END,
          speaker_id = CASE WHEN @speakerIdProvided = 1 THEN @speakerId ELSE speaker_id END,
          title = COALESCE(JSON_VALUE(@payload, '$.title'), title),
          description = CASE WHEN JSON_QUERY(@payload, '$.description') IS NOT NULL OR JSON_VALUE(@payload, '$.description') IS NOT NULL THEN JSON_VALUE(@payload, '$.description') ELSE description END,
          starts_at = CASE WHEN JSON_VALUE(@payload, '$.startsAt') IS NOT NULL THEN TRY_CONVERT(datetime2, JSON_VALUE(@payload, '$.startsAt')) ELSE starts_at END,
          ends_at = CASE WHEN JSON_VALUE(@payload, '$.endsAt') IS NOT NULL THEN TRY_CONVERT(datetime2, JSON_VALUE(@payload, '$.endsAt')) ELSE ends_at END,
          time_label = COALESCE(JSON_VALUE(@payload, '$.timeLabel'), time_label),
          speaker = COALESCE(JSON_VALUE(@payload, '$.speaker'), speaker),
          speaker_role = COALESCE(JSON_VALUE(@payload, '$.speakerRole'), speaker_role),
          speaker_image_file_id = CASE WHEN JSON_VALUE(@payload, '$.speakerImageFileId') IS NOT NULL THEN TRY_CONVERT(uniqueidentifier, JSON_VALUE(@payload, '$.speakerImageFileId')) ELSE speaker_image_file_id END,
          speaker_email = COALESCE(JSON_VALUE(@payload, '$.speakerEmail'), speaker_email),
          location = COALESCE(JSON_VALUE(@payload, '$.location'), location),
          track = COALESCE(JSON_VALUE(@payload, '$.track'), track),
          action_label = COALESCE(JSON_VALUE(@payload, '$.actionLabel'), action_label),
          action_url = COALESCE(JSON_VALUE(@payload, '$.actionUrl'), action_url),
          image_file_id = CASE WHEN JSON_VALUE(@payload, '$.imageFileId') IS NOT NULL THEN TRY_CONVERT(uniqueidentifier, JSON_VALUE(@payload, '$.imageFileId')) ELSE image_file_id END,
          status = COALESCE(JSON_VALUE(@payload, '$.status'), status),
          sort_order = COALESCE(TRY_CONVERT(int, JSON_VALUE(@payload, '$.sortOrder')), sort_order),
          updated_by = COALESCE(@userId, updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND event_id = @eventId AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapAgendaItem(result.recordset[0]) : null;
    }
    async deleteAgendaItem(eventId, id, userId) {
        await this.softDelete('event_agenda_items', eventId, id, userId);
    }
    async listTestimonials(eventId, onlyPublished = false) {
        const rows = await this.listRows('event_testimonials', eventId, onlyPublished);
        return rows.map(mapTestimonial);
    }
    async createTestimonial(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('authorName', mssql_1.default.NVarChar(180), input.authorName)
            .input('authorRole', mssql_1.default.NVarChar(180), input.authorRole ?? null)
            .input('quote', mssql_1.default.NVarChar(mssql_1.default.MAX), input.quote)
            .input('imageFileId', mssql_1.default.UniqueIdentifier, input.imageFileId ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'published')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_testimonials (event_id, author_name, author_role, quote, image_file_id, status, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @authorName, @authorRole, @quote, @imageFileId, @status, @sortOrder, @userId, @userId)
      `);
        return mapTestimonial(result.recordset[0]);
    }
    async updateTestimonial(eventId, id, input, userId) {
        const updated = await this.updateGeneric(eventId, id, input, userId, 'event_testimonials', {
            authorName: 'author_name',
            authorRole: 'author_role',
            quote: 'quote',
            imageFileId: 'image_file_id',
            status: 'status',
            sortOrder: 'sort_order',
        });
        return updated ? mapTestimonial(updated) : null;
    }
    async deleteTestimonial(eventId, id, userId) {
        await this.softDelete('event_testimonials', eventId, id, userId);
    }
    async listSpeakers(eventId, onlyPublished = false) {
        await this.createMissingRegistrationSpeakers(eventId, onlyPublished);
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished ? 1 : 0)
            .query(`
        SELECT speaker.*, registration.program_id, program.name AS program_name
        FROM dbo.event_speakers speaker
        LEFT JOIN dbo.event_registrations registration ON registration.id = speaker.source_registration_id
        LEFT JOIN dbo.event_programs program ON program.id = registration.program_id
        WHERE speaker.event_id = @eventId
          AND speaker.deleted_at IS NULL
          AND (@onlyPublished = 0 OR speaker.status = 'published')
        ORDER BY
          CASE WHEN speaker.source_registration_id IS NULL THEN 0 ELSE 1 END ASC,
          speaker.sort_order ASC,
          speaker.created_at ASC
      `);
        const rows = result.recordset;
        return rows.map(mapSpeaker);
    }
    async createMissingRegistrationSpeakers(eventId, onlyPublished = false) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished ? 1 : 0)
            .query(`
        INSERT INTO dbo.event_speakers (
          event_id, source_registration_id, name, role, bio, image_file_id, email, phone,
          organization, website_url, social_url, professional_experience_json, status, created_by, updated_by
        )
        SELECT
          registration.event_id,
          registration.id,
          LTRIM(RTRIM(CONCAT(profile.first_name, ' ', profile.last_name))) AS name,
          COALESCE(JSON_VALUE(response.answers_json, '$.role'), JSON_VALUE(response.answers_json, '$.cargo'), JSON_VALUE(response.answers_json, '$.puesto'), JSON_VALUE(response.answers_json, '$.position')) AS role,
          COALESCE(JSON_VALUE(response.answers_json, '$.bio'), JSON_VALUE(response.answers_json, '$.biografia'), JSON_VALUE(response.answers_json, '$.resumen'), JSON_VALUE(response.answers_json, '$.abstract'), JSON_VALUE(response.answers_json, '$.semblanza')) AS bio,
          COALESCE(TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.imageFileId')), TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.profilePhoto')), TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.photo')), TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.foto'))) AS image_file_id,
          profile.email,
          profile.phone,
          COALESCE(JSON_VALUE(response.answers_json, '$.organization'), JSON_VALUE(response.answers_json, '$.organizacion'), JSON_VALUE(response.answers_json, '$.institucion'), JSON_VALUE(response.answers_json, '$.institution'), profile.institution) AS organization,
          COALESCE(JSON_VALUE(response.answers_json, '$.website'), JSON_VALUE(response.answers_json, '$.websiteUrl'), JSON_VALUE(response.answers_json, '$.sitioWeb')) AS website_url,
          COALESCE(JSON_VALUE(response.answers_json, '$.social'), JSON_VALUE(response.answers_json, '$.socialUrl'), JSON_VALUE(response.answers_json, '$.linkedin'), JSON_VALUE(response.answers_json, '$.perfilSocial')) AS social_url,
          profile.professional_experience_json,
          CASE
            WHEN registration.status IN ('approved', 'accepted_pending_payment', 'confirmed', 'checked_in') THEN 'published'
            ELSE 'draft'
          END,
          NULL,
          NULL
        FROM dbo.event_registrations registration
        INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
        LEFT JOIN dbo.event_registration_form_responses response ON response.registration_id = registration.id
        WHERE registration.event_id = @eventId
          AND registration.participation_mode <> 'attendee'
          AND (
            (@onlyPublished = 1 AND registration.status IN ('approved', 'accepted_pending_payment', 'confirmed', 'checked_in'))
            OR (@onlyPublished = 0 AND registration.status IN ('pending_review', 'pending_payment', 'registered', 'approved', 'accepted_pending_payment', 'confirmed', 'checked_in'))
          )
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.event_speakers speaker
            WHERE speaker.source_registration_id = registration.id
          )
      `);
    }
    async createSpeaker(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('name', mssql_1.default.NVarChar(180), input.name)
            .input('role', mssql_1.default.NVarChar(180), input.role ?? null)
            .input('bio', mssql_1.default.NVarChar(mssql_1.default.MAX), input.bio ?? null)
            .input('imageFileId', mssql_1.default.UniqueIdentifier, input.imageFileId ?? null)
            .input('email', mssql_1.default.NVarChar(180), input.email ?? null)
            .input('phone', mssql_1.default.NVarChar(80), input.phone ?? null)
            .input('organization', mssql_1.default.NVarChar(180), input.organization ?? null)
            .input('websiteUrl', mssql_1.default.NVarChar(500), input.websiteUrl ?? null)
            .input('socialUrl', mssql_1.default.NVarChar(500), input.socialUrl ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'published')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_speakers (event_id, name, role, bio, image_file_id, email, phone, organization, website_url, social_url, status, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @name, @role, @bio, @imageFileId, @email, @phone, @organization, @websiteUrl, @socialUrl, @status, @sortOrder, @userId, @userId)
      `);
        return mapSpeaker(result.recordset[0]);
    }
    async updateSpeaker(eventId, id, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar(180), input.name ?? null)
            .input('nameProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'name'))
            .input('role', mssql_1.default.NVarChar(180), input.role ?? null)
            .input('roleProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'role'))
            .input('bio', mssql_1.default.NVarChar(mssql_1.default.MAX), input.bio ?? null)
            .input('bioProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'bio'))
            .input('imageFileId', mssql_1.default.UniqueIdentifier, input.imageFileId ?? null)
            .input('imageFileIdProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'imageFileId'))
            .input('email', mssql_1.default.NVarChar(180), input.email ?? null)
            .input('emailProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'email'))
            .input('phone', mssql_1.default.NVarChar(80), input.phone ?? null)
            .input('phoneProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'phone'))
            .input('organization', mssql_1.default.NVarChar(180), input.organization ?? null)
            .input('organizationProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'organization'))
            .input('websiteUrl', mssql_1.default.NVarChar(500), input.websiteUrl ?? null)
            .input('websiteUrlProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'websiteUrl'))
            .input('socialUrl', mssql_1.default.NVarChar(500), input.socialUrl ?? null)
            .input('socialUrlProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'socialUrl'))
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .input('statusProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'status'))
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .input('sortOrderProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'sortOrder'))
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        UPDATE speaker
        SET name = CASE WHEN @nameProvided = 1 THEN @name ELSE speaker.name END,
          role = CASE WHEN @roleProvided = 1 THEN @role ELSE speaker.role END,
          bio = CASE WHEN @bioProvided = 1 THEN @bio ELSE speaker.bio END,
          image_file_id = CASE WHEN @imageFileIdProvided = 1 THEN @imageFileId ELSE speaker.image_file_id END,
          email = CASE WHEN @emailProvided = 1 THEN @email ELSE speaker.email END,
          phone = CASE WHEN @phoneProvided = 1 THEN @phone ELSE speaker.phone END,
          organization = CASE WHEN @organizationProvided = 1 THEN @organization ELSE speaker.organization END,
          website_url = CASE WHEN @websiteUrlProvided = 1 THEN @websiteUrl ELSE speaker.website_url END,
          social_url = CASE WHEN @socialUrlProvided = 1 THEN @socialUrl ELSE speaker.social_url END,
          status = CASE WHEN @statusProvided = 1 THEN @status ELSE speaker.status END,
          sort_order = CASE WHEN @sortOrderProvided = 1 THEN @sortOrder ELSE speaker.sort_order END,
          updated_by = COALESCE(@userId, speaker.updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*, registration.program_id, program.name AS program_name
        FROM dbo.event_speakers speaker
        LEFT JOIN dbo.event_registrations registration ON registration.id = speaker.source_registration_id
        LEFT JOIN dbo.event_programs program ON program.id = registration.program_id
        WHERE speaker.id = @id AND speaker.event_id = @eventId AND speaker.deleted_at IS NULL
      `);
        return result.recordset[0] ? mapSpeaker(result.recordset[0]) : null;
    }
    async deleteSpeaker(eventId, id, userId) {
        await this.softDelete('event_speakers', eventId, id, userId);
    }
    async listFaqs(eventId, onlyPublished = false) {
        const rows = await this.listRows('event_faq_items', eventId, onlyPublished);
        return rows.map(mapFaq);
    }
    async createFaq(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('question', mssql_1.default.NVarChar(260), input.question)
            .input('answer', mssql_1.default.NVarChar(mssql_1.default.MAX), input.answer)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'published')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_faq_items (event_id, question, answer, status, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @question, @answer, @status, @sortOrder, @userId, @userId)
      `);
        return mapFaq(result.recordset[0]);
    }
    async updateFaq(eventId, id, input, userId) {
        const updated = await this.updateGeneric(eventId, id, input, userId, 'event_faq_items', {
            question: 'question',
            answer: 'answer',
            status: 'status',
            sortOrder: 'sort_order',
        });
        return updated ? mapFaq(updated) : null;
    }
    async deleteFaq(eventId, id, userId) {
        await this.softDelete('event_faq_items', eventId, id, userId);
    }
    async listSponsors(eventId, onlyPublished = false) {
        const rows = await this.listRows('event_sponsors', eventId, onlyPublished);
        return rows.map(mapSponsor);
    }
    async createSponsor(eventId, input, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('name', mssql_1.default.NVarChar(180), input.name)
            .input('tier', mssql_1.default.NVarChar(120), input.tier ?? null)
            .input('url', mssql_1.default.NVarChar(500), input.url ?? null)
            .input('logoFileId', mssql_1.default.UniqueIdentifier, input.logoFileId ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'published')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_sponsors (event_id, name, tier, url, logo_file_id, status, sort_order, created_by, updated_by)
        OUTPUT INSERTED.*
        VALUES (@eventId, @name, @tier, @url, @logoFileId, @status, @sortOrder, @userId, @userId)
      `);
        return mapSponsor(result.recordset[0]);
    }
    async updateSponsor(eventId, id, input, userId) {
        const updated = await this.updateGeneric(eventId, id, input, userId, 'event_sponsors', {
            name: 'name',
            tier: 'tier',
            url: 'url',
            logoFileId: 'logo_file_id',
            status: 'status',
            sortOrder: 'sort_order',
        });
        return updated ? mapSponsor(updated) : null;
    }
    async deleteSponsor(eventId, id, userId) {
        await this.softDelete('event_sponsors', eventId, id, userId);
    }
    async listPaymentSettings(eventId) {
        const rows = await this.providerRows(eventId);
        return rows.map(mapProviderSummary);
    }
    async getPaymentPolicy(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT TOP 1 payment_policy
        FROM dbo.event_settings
        WHERE event_id = @eventId
      `);
        return result.recordset[0]?.payment_policy ?? 'immediate';
    }
    async updatePaymentPolicy(eventId, paymentPolicy) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('paymentPolicy', mssql_1.default.NVarChar(40), paymentPolicy)
            .query(`
        MERGE dbo.event_settings AS target
        USING (SELECT @eventId AS event_id) AS source
        ON target.event_id = source.event_id
        WHEN MATCHED THEN
          UPDATE SET payment_policy = @paymentPolicy
        WHEN NOT MATCHED THEN
          INSERT (event_id, default_currency, payment_policy)
          VALUES (@eventId, 'MXN', @paymentPolicy);
      `);
    }
    async findActivePaymentSettings(eventId, provider) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('provider', mssql_1.default.NVarChar(60), provider)
            .query(`
        SELECT TOP 1 * FROM dbo.event_payment_provider_settings
        WHERE event_id = @eventId AND provider = @provider AND is_active = 1 AND deleted_at IS NULL
      `);
        const row = result.recordset[0];
        if (!row)
            return null;
        return {
            ...mapProviderSummary(row),
            secretKey: (0, secrets_1.decryptSecret)(row.secret_key_encrypted),
            webhookSecret: (0, secrets_1.decryptSecret)(row.webhook_secret_encrypted),
        };
    }
    async listActivePaymentSettings(provider) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('provider', mssql_1.default.NVarChar(60), provider)
            .query(`
        SELECT * FROM dbo.event_payment_provider_settings
        WHERE provider = @provider AND is_active = 1 AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `);
        return result.recordset.map((row) => ({
            ...mapProviderSummary(row),
            secretKey: (0, secrets_1.decryptSecret)(row.secret_key_encrypted),
            webhookSecret: (0, secrets_1.decryptSecret)(row.webhook_secret_encrypted),
        }));
    }
    async listConfiguredPaymentProviders(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT provider, mode, is_default AS isDefault
        FROM dbo.event_payment_provider_settings
        WHERE event_id = @eventId
          AND is_active = 1
          AND deleted_at IS NULL
          AND secret_key_encrypted IS NOT NULL
          AND (provider <> 'stripe' OR webhook_secret_encrypted IS NOT NULL)
          AND (provider <> 'openpay' OR public_key IS NOT NULL)
        ORDER BY is_default DESC, provider ASC
      `);
        return result.recordset;
    }
    async upsertPaymentSettings(eventId, input, userId) {
        if (input.paymentPolicy) {
            await this.updatePaymentPolicy(eventId, input.paymentPolicy);
        }
        const provider = input.provider;
        const pool = await (0, database_1.getSqlPool)();
        const existing = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('provider', mssql_1.default.NVarChar(60), provider)
            .query(`
        SELECT TOP 1 * FROM dbo.event_payment_provider_settings
        WHERE event_id = @eventId AND provider = @provider AND deleted_at IS NULL
      `);
        const previous = existing.recordset[0];
        const previousMetadata = previous ? parseJson(previous.metadata_json) : {};
        const requestedMode = (input.mode ?? 'test');
        const modeChanged = Boolean(previous && previous.mode !== requestedMode);
        const providerRequiresPublicKey = provider === 'openpay';
        if (input.isActive !== false && modeChanged && (!input.secretKey
            || (provider === 'stripe' && !input.webhookSecret)
            || (providerRequiresPublicKey && !input.publicKey))) {
            throw new app_error_1.AppError('Al cambiar entre Test y Live debes capturar nuevamente las credenciales correspondientes a ese ambiente.', 400, 'PAYMENT_MODE_CREDENTIALS_REQUIRED');
        }
        const effectiveSecret = input.secretKey || (previous ? (0, secrets_1.decryptSecret)(previous.secret_key_encrypted) : null);
        const effectiveWebhookSecret = input.webhookSecret || (previous ? (0, secrets_1.decryptSecret)(previous.webhook_secret_encrypted) : null);
        const effectivePublicKey = input.publicKey ?? previous?.public_key ?? null;
        const effectiveOpenpayPublicKey = input.openpayPublicKey ?? (typeof previousMetadata.openpayPublicKey === 'string' ? previousMetadata.openpayPublicKey : null);
        const effectiveOpenpayApiUrl = input.openpayApiUrl ?? (typeof previousMetadata.openpayApiUrl === 'string' ? previousMetadata.openpayApiUrl : null);
        if (input.isActive !== false && (!effectiveSecret || (provider === 'stripe' && !effectiveWebhookSecret) || (providerRequiresPublicKey && !effectivePublicKey))) {
            throw new app_error_1.AppError(provider === 'stripe'
                ? 'Para activar Stripe debes guardar la clave secreta y el secreto del webhook.'
                : provider === 'openpay'
                    ? 'Para activar Openpay BBVA debes guardar el Merchant ID y la Private key.'
                    : 'Para activar Mercado Pago debes guardar el access token.', 400, 'INCOMPLETE_EVENT_PAYMENT_CONFIGURATION');
        }
        if (input.isActive !== false && provider === 'stripe') {
            const expectedSecretPrefix = requestedMode === 'test' ? 'sk_test_' : 'sk_live_';
            const expectedPublicPrefix = requestedMode === 'test' ? 'pk_test_' : 'pk_live_';
            if (!effectiveSecret?.startsWith(expectedSecretPrefix)) {
                throw new app_error_1.AppError(`La clave secreta de Stripe no corresponde al modo ${requestedMode === 'test' ? 'Test' : 'Live'}.`, 400, 'STRIPE_KEY_MODE_MISMATCH');
            }
            if (input.publicKey && !input.publicKey.startsWith(expectedPublicPrefix)) {
                throw new app_error_1.AppError(`La clave pública de Stripe no corresponde al modo ${requestedMode === 'test' ? 'Test' : 'Live'}.`, 400, 'STRIPE_PUBLIC_KEY_MODE_MISMATCH');
            }
            if (!effectiveWebhookSecret?.startsWith('whsec_')) {
                throw new app_error_1.AppError('El secreto del webhook de Stripe debe comenzar con whsec_.', 400, 'INVALID_STRIPE_WEBHOOK_SECRET');
            }
        }
        if (input.isDefault && input.isActive === false) {
            throw new app_error_1.AppError('Solo una pasarela activa puede marcarse como predeterminada.', 400, 'DEFAULT_PAYMENT_PROVIDER_MUST_BE_ACTIVE');
        }
        if (input.isDefault) {
            await pool.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('provider', mssql_1.default.NVarChar(60), provider)
                .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
                .query(`
          UPDATE dbo.event_payment_provider_settings
          SET is_default = 0, updated_by = @userId, updated_at = SYSUTCDATETIME()
          WHERE event_id = @eventId
            AND provider <> @provider
            AND deleted_at IS NULL
        `);
        }
        const metadata = {
            secretLast4: (0, secrets_1.secretLast4)(effectiveSecret),
            webhookSecretLast4: (0, secrets_1.secretLast4)(effectiveWebhookSecret),
            openpayPublicKey: provider === 'openpay' ? effectiveOpenpayPublicKey : undefined,
            openpayApiUrl: provider === 'openpay' ? effectiveOpenpayApiUrl : undefined,
        };
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('provider', mssql_1.default.NVarChar(60), provider)
            .input('mode', mssql_1.default.NVarChar(20), input.mode ?? 'test')
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('isDefault', mssql_1.default.Bit, input.isDefault ?? false)
            .input('publicKey', mssql_1.default.NVarChar(500), input.publicKey ?? null)
            .input('secretKeyEncrypted', mssql_1.default.NVarChar(mssql_1.default.MAX), input.secretKey ? (0, secrets_1.encryptSecret)(input.secretKey) : null)
            .input('webhookSecretEncrypted', mssql_1.default.NVarChar(mssql_1.default.MAX), input.webhookSecret ? (0, secrets_1.encryptSecret)(input.webhookSecret) : null)
            .input('metadataJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(metadata))
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        MERGE dbo.event_payment_provider_settings AS target
        USING (SELECT @eventId AS event_id, @provider AS provider) AS source
        ON target.event_id = source.event_id AND target.provider = source.provider
        WHEN MATCHED THEN
            UPDATE SET mode = @mode,
            is_active = @isActive,
            is_default = @isDefault,
            public_key = @publicKey,
            secret_key_encrypted = COALESCE(@secretKeyEncrypted, target.secret_key_encrypted),
            webhook_secret_encrypted = COALESCE(@webhookSecretEncrypted, target.webhook_secret_encrypted),
            metadata_json = @metadataJson,
            updated_by = @userId,
            updated_at = SYSUTCDATETIME(),
            deleted_at = NULL
        WHEN NOT MATCHED THEN
          INSERT (event_id, provider, mode, is_active, is_default, public_key, secret_key_encrypted, webhook_secret_encrypted, metadata_json, created_by, updated_by)
          VALUES (@eventId, @provider, @mode, @isActive, @isDefault, @publicKey, @secretKeyEncrypted, @webhookSecretEncrypted, @metadataJson, @userId, @userId)
        OUTPUT INSERTED.*;
      `);
        return mapProviderSummary(result.recordset[0]);
    }
    async deletePaymentSettings(eventId, id, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const pending = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('settingsId', mssql_1.default.UniqueIdentifier, id)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.payment_orders po
        INNER JOIN dbo.payment_providers pp ON pp.id = po.provider_id
        INNER JOIN dbo.event_payment_provider_settings eps
          ON eps.event_id = po.event_id AND eps.provider = pp.name
        WHERE eps.id = @settingsId
          AND eps.event_id = @eventId
          AND po.status IN ('created', 'pending')
      `);
        if ((pending.recordset[0]?.total ?? 0) > 0) {
            throw new app_error_1.AppError('No puedes eliminar esta pasarela porque tiene pagos pendientes. Complétalos o cancélalos primero.', 409, 'PAYMENT_PROVIDER_HAS_PENDING_ORDERS');
        }
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        UPDATE dbo.event_payment_provider_settings
        SET is_active = 0, is_default = 0, deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
        WHERE id = @id AND event_id = @eventId AND deleted_at IS NULL
      `);
        return (result.rowsAffected[0] ?? 0) > 0;
    }
    async providerRows(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT * FROM dbo.event_payment_provider_settings
        WHERE event_id = @eventId AND deleted_at IS NULL
        ORDER BY is_default DESC, provider ASC
      `);
        return result.recordset;
    }
    async listRows(table, eventId, onlyPublished) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished)
            .query(`
        SELECT * FROM dbo.${table}
        WHERE event_id = @eventId AND deleted_at IS NULL AND (@onlyPublished = 0 OR status = 'published')
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset;
    }
    async softDelete(table, eventId, id, userId) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        UPDATE dbo.${table}
        SET deleted_at = SYSUTCDATETIME(), updated_by = COALESCE(@userId, updated_by), updated_at = SYSUTCDATETIME()
        WHERE id = @id AND event_id = @eventId AND deleted_at IS NULL
      `);
    }
    async updateGeneric(eventId, id, input, userId, table, fields) {
        const sets = [];
        const request = (await (0, database_1.getSqlPool)()).request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null);
        for (const [key, column] of Object.entries(fields)) {
            if (!Object.prototype.hasOwnProperty.call(input, key))
                continue;
            const param = key;
            const value = input[key];
            if (key.endsWith('FileId') || key.endsWith('Id')) {
                request.input(param, mssql_1.default.UniqueIdentifier, value ?? null);
            }
            else if (key === 'sortOrder') {
                request.input(param, mssql_1.default.Int, value ?? null);
            }
            else if (typeof value === 'boolean' || key === 'isActive') {
                request.input(param, mssql_1.default.Bit, value ?? null);
            }
            else {
                request.input(param, mssql_1.default.NVarChar(mssql_1.default.MAX), value ?? null);
            }
            sets.push(`${column} = @${param}`);
        }
        if (!sets.length)
            return null;
        const result = await request.query(`
      UPDATE dbo.${table}
      SET ${sets.join(', ')}, updated_by = COALESCE(@userId, updated_by), updated_at = SYSUTCDATETIME()
      OUTPUT INSERTED.*
      WHERE id = @id AND event_id = @eventId AND deleted_at IS NULL
    `);
        return result.recordset[0] ?? null;
    }
}
exports.SiteDataRepository = SiteDataRepository;
//# sourceMappingURL=site-data.repository.js.map