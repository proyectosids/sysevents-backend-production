"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
const slug_1 = require("../../../../shared/utils/slug");
function mapEvent(row) {
    const isHistorical = Boolean(row.ends_at && row.ends_at < new Date());
    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        logoFileId: row.logo_file_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        mainModality: row.main_modality,
        status: row.status,
        publishedAt: row.published_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isHistorical,
    };
}
class EventsRepository {
    async listEvents() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .query('SELECT * FROM dbo.events WHERE deleted_at IS NULL ORDER BY created_at DESC');
        return result.recordset.map(mapEvent);
    }
    async listEventsForUser(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT e.*
        FROM dbo.events e
        INNER JOIN dbo.tenant_users tu ON tu.tenant_id = e.tenant_id
        WHERE tu.user_id = @userId AND e.deleted_at IS NULL
        ORDER BY e.created_at DESC
      `);
        return result.recordset.map(mapEvent);
    }
    async countActiveEventsByTenant(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.events
        WHERE tenant_id = @tenantId
          AND deleted_at IS NULL
          AND (ends_at IS NULL OR ends_at >= SYSUTCDATETIME())
      `);
        return result.recordset[0]?.total ?? 0;
    }
    async findCurrentEventByTenant(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT TOP 1 *
        FROM dbo.events
        WHERE tenant_id = @tenantId
          AND deleted_at IS NULL
          AND status IN ('published', 'active')
          AND (ends_at IS NULL OR ends_at >= SYSUTCDATETIME())
        ORDER BY
          CASE WHEN starts_at IS NULL THEN 1 ELSE 0 END,
          starts_at ASC,
          created_at DESC
      `);
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
    async createEvent(input) {
        const pool = await (0, database_1.getSqlPool)();
        const slug = await (0, slug_1.createUniqueSlug)(input.slug ?? input.name, (candidate) => this.eventSlugExists(input.tenantId, candidate), {
            fallback: 'evento',
            maxLength: 140,
        });
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const eventResult = await transaction
                .request()
                .input('tenantId', mssql_1.default.UniqueIdentifier, input.tenantId)
                .input('name', mssql_1.default.NVarChar(200), input.name)
                .input('slug', mssql_1.default.NVarChar(140), slug)
                .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
                .input('startsAt', mssql_1.default.DateTime2, input.startsAt ?? null)
                .input('endsAt', mssql_1.default.DateTime2, input.endsAt ?? null)
                .input('mainModality', mssql_1.default.NVarChar(80), input.mainModality ?? null)
                .input('createdBy', mssql_1.default.UniqueIdentifier, input.createdBy ?? null)
                .query(`
          INSERT INTO dbo.events (
            tenant_id, name, slug, description, starts_at, ends_at, main_modality, created_by, updated_by
          )
          OUTPUT INSERTED.*
          VALUES (
            @tenantId, @name, @slug, @description, @startsAt, @endsAt, @mainModality, @createdBy, @createdBy
          )
        `);
            const event = mapEvent(eventResult.recordset[0]);
            await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, event.id)
                .query(`
          INSERT INTO dbo.event_settings (event_id, default_currency) VALUES (@eventId, 'MXN');
          INSERT INTO dbo.event_pages (event_id, title, slug, sort_order) VALUES (@eventId, 'Home', 'home', 0);
        `);
            const pageResult = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, event.id)
                .query('SELECT TOP 1 id FROM dbo.event_pages WHERE event_id = @eventId AND slug = \'home\'');
            const pageId = pageResult.recordset[0].id;
            const sections = ['hero', 'about', 'important_dates', 'pricing', 'speakers', 'submission_guidelines', 'faq', 'contact'];
            for (let index = 0; index < sections.length; index += 1) {
                await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, event.id)
                    .input('pageId', mssql_1.default.UniqueIdentifier, pageId)
                    .input('sectionType', mssql_1.default.NVarChar(80), sections[index])
                    .input('sortOrder', mssql_1.default.Int, index)
                    .query(`
            INSERT INTO dbo.event_page_sections (event_id, page_id, section_type, sort_order)
            VALUES (@eventId, @pageId, @sectionType, @sortOrder)
          `);
            }
            if (input.mainModality) {
                await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, event.id)
                    .input('name', mssql_1.default.NVarChar(100), input.mainModality)
                    .query('INSERT INTO dbo.event_modalities (event_id, name) VALUES (@eventId, @name)');
            }
            await transaction.commit();
            return event;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async eventSlugExists(tenantId, slug, excludeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .input('slug', mssql_1.default.NVarChar(140), slug)
            .input('excludeId', mssql_1.default.UniqueIdentifier, excludeId ?? null)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.events
        WHERE tenant_id = @tenantId
          AND slug = @slug
          AND deleted_at IS NULL
          AND (@excludeId IS NULL OR id <> @excludeId)
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async findEventById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query('SELECT TOP 1 * FROM dbo.events WHERE id = @id AND deleted_at IS NULL');
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
    async findPublishedBySlug(slug) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('slug', mssql_1.default.NVarChar(140), slug)
            .query(`
        SELECT TOP 1 * FROM dbo.events
        WHERE slug = @slug AND status = 'published' AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
    async updateEvent(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar(200), input.name ?? null)
            .input('slug', mssql_1.default.NVarChar(140), input.slug ?? null)
            .input('description', mssql_1.default.NVarChar(mssql_1.default.MAX), input.description ?? null)
            .input('descriptionProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'description'))
            .input('startsAt', mssql_1.default.DateTime2, input.startsAt ?? null)
            .input('startsAtProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'startsAt'))
            .input('endsAt', mssql_1.default.DateTime2, input.endsAt ?? null)
            .input('endsAtProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'endsAt'))
            .input('mainModality', mssql_1.default.NVarChar(80), input.mainModality ?? null)
            .input('mainModalityProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'mainModality'))
            .input('logoFileId', mssql_1.default.UniqueIdentifier, input.logoFileId ?? null)
            .input('logoFileIdProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'logoFileId'))
            .input('updatedBy', mssql_1.default.UniqueIdentifier, input.updatedBy ?? null)
            .query(`
        UPDATE dbo.events
        SET
          name = COALESCE(@name, name),
          slug = COALESCE(@slug, slug),
          description = CASE WHEN @descriptionProvided = 1 THEN @description ELSE description END,
          starts_at = CASE WHEN @startsAtProvided = 1 THEN @startsAt ELSE starts_at END,
          ends_at = CASE WHEN @endsAtProvided = 1 THEN @endsAt ELSE ends_at END,
          main_modality = CASE WHEN @mainModalityProvided = 1 THEN @mainModality ELSE main_modality END,
          logo_file_id = CASE WHEN @logoFileIdProvided = 1 THEN @logoFileId ELSE logo_file_id END,
          updated_by = COALESCE(@updatedBy, updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
    async softDeleteEvent(id, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        UPDATE dbo.events
        SET deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
    async publishEvent(id, userId) {
        const event = await this.findEventById(id);
        if (!event) {
            return null;
        }
        if (!event.name || !event.slug || !event.tenantId || !event.startsAt || !event.endsAt) {
            throw new app_error_1.AppError('Event is missing required publishing fields', 400, 'EVENT_NOT_READY');
        }
        if (event.endsAt < event.startsAt) {
            throw new app_error_1.AppError('Event end date must be after start date', 400, 'INVALID_EVENT_DATES');
        }
        if (event.isHistorical) {
            throw new app_error_1.AppError('Historical events cannot be republished', 409, 'EVENT_IS_HISTORICAL');
        }
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        UPDATE dbo.events
        SET status = 'published', published_at = COALESCE(published_at, SYSUTCDATETIME()),
            updated_by = @userId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
    async cloneEventDesign(sourceEventId, targetEventId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('sourceEventId', mssql_1.default.UniqueIdentifier, sourceEventId)
            .input('targetEventId', mssql_1.default.UniqueIdentifier, targetEventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        BEGIN TRANSACTION;
        BEGIN TRY
          DELETE FROM dbo.event_page_sections WHERE event_id = @targetEventId;
          DELETE FROM dbo.event_pages WHERE event_id = @targetEventId;

          DECLARE @pageMap TABLE (source_id UNIQUEIDENTIFIER, target_id UNIQUEIDENTIFIER);
          DECLARE @sourcePageId UNIQUEIDENTIFIER, @targetPageId UNIQUEIDENTIFIER;
          DECLARE page_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT id FROM dbo.event_pages WHERE event_id = @sourceEventId AND deleted_at IS NULL ORDER BY sort_order;
          OPEN page_cursor;
          FETCH NEXT FROM page_cursor INTO @sourcePageId;
          WHILE @@FETCH_STATUS = 0
          BEGIN
            SET @targetPageId = NEWID();
            INSERT INTO dbo.event_pages (
              id, event_id, title, slug, status, seo_title, seo_description, sort_order, created_by, updated_by
            )
            SELECT @targetPageId, @targetEventId, title, slug, 'draft', seo_title, seo_description, sort_order, @userId, @userId
            FROM dbo.event_pages WHERE id = @sourcePageId;
            INSERT INTO @pageMap (source_id, target_id) VALUES (@sourcePageId, @targetPageId);
            FETCH NEXT FROM page_cursor INTO @sourcePageId;
          END
          CLOSE page_cursor;
          DEALLOCATE page_cursor;

          INSERT INTO dbo.event_page_sections (
            event_id, page_id, section_type, title, content_json, status, sort_order, created_by, updated_by
          )
          SELECT @targetEventId, map.target_id, section.section_type, section.title,
            section.content_json, 'draft', section.sort_order, @userId, @userId
          FROM dbo.event_page_sections section
          LEFT JOIN @pageMap map ON map.source_id = section.page_id
          WHERE section.event_id = @sourceEventId AND section.deleted_at IS NULL;

          UPDATE target
          SET registration_enabled = source.registration_enabled,
              submissions_enabled = source.submissions_enabled,
              default_currency = source.default_currency,
              contact_email = source.contact_email,
              settings_json = source.settings_json,
              updated_at = SYSUTCDATETIME()
          FROM dbo.event_settings target
          INNER JOIN dbo.event_settings source ON source.event_id = @sourceEventId
          WHERE target.event_id = @targetEventId;

          IF EXISTS (SELECT 1 FROM dbo.event_site_settings WHERE event_id = @sourceEventId)
          BEGIN
            MERGE dbo.event_site_settings AS target
            USING (
              SELECT @targetEventId AS event_id, theme_id, site_title, logo_file_id, favicon_file_id,
                global_styles_json, custom_css
              FROM dbo.event_site_settings WHERE event_id = @sourceEventId
            ) AS source ON target.event_id = source.event_id
            WHEN MATCHED THEN UPDATE SET
              theme_id = source.theme_id, site_title = source.site_title, logo_file_id = source.logo_file_id,
              favicon_file_id = source.favicon_file_id, global_styles_json = source.global_styles_json,
              custom_css = source.custom_css, status = 'draft', published_at = NULL, updated_at = SYSUTCDATETIME()
            WHEN NOT MATCHED THEN INSERT (
              event_id, theme_id, site_title, logo_file_id, favicon_file_id, global_styles_json, custom_css, status
            ) VALUES (
              source.event_id, source.theme_id, source.site_title, source.logo_file_id, source.favicon_file_id,
              source.global_styles_json, source.custom_css, 'draft'
            );
          END

          DELETE FROM dbo.event_site_navigation_items WHERE event_id = @targetEventId;
          INSERT INTO dbo.event_site_navigation_items (event_id, label, url, target, sort_order, is_visible)
          SELECT @targetEventId, label, url, target, sort_order, is_visible
          FROM dbo.event_site_navigation_items WHERE event_id = @sourceEventId;

          DELETE FROM dbo.event_menu_items WHERE event_id = @targetEventId;
          INSERT INTO dbo.event_menu_items (event_id, label, url, sort_order, is_visible)
          SELECT @targetEventId, label, url, sort_order, is_visible
          FROM dbo.event_menu_items WHERE event_id = @sourceEventId;

          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
          THROW;
        END CATCH
      `);
    }
    async unpublishEvent(id, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        UPDATE dbo.events
        SET status = 'unpublished', updated_by = @userId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapEvent(result.recordset[0]) : null;
    }
}
exports.EventsRepository = EventsRepository;
//# sourceMappingURL=events.repository.js.map