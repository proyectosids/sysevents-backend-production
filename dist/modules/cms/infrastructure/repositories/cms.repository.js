"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const slug_1 = require("../../../../shared/utils/slug");
function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return {};
    }
}
function stringifyJson(value) {
    return JSON.stringify(value ?? {});
}
function mapPage(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        sortOrder: row.sort_order,
    };
}
function mapSection(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        pageId: row.page_id,
        sectionType: row.section_type,
        title: row.title,
        content: parseJson(row.content_json),
        status: row.status,
        sortOrder: row.sort_order,
    };
}
class CmsRepository {
    async listPages(eventId, onlyPublished = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished)
            .query(`
        SELECT * FROM dbo.event_pages
        WHERE event_id = @eventId
          AND deleted_at IS NULL
          AND (@onlyPublished = 0 OR status = 'published')
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset.map(mapPage);
    }
    async createPage(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const slug = await (0, slug_1.createUniqueSlug)(input.slug ?? input.title, (candidate) => this.pageSlugExists(eventId, candidate), {
            fallback: 'pagina',
            maxLength: 120,
        });
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('title', mssql_1.default.NVarChar(180), input.title)
            .input('slug', mssql_1.default.NVarChar(120), slug)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'draft')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('createdBy', mssql_1.default.UniqueIdentifier, input.createdBy ?? null)
            .query(`
        INSERT INTO dbo.event_pages (event_id, title, slug, status, sort_order, created_by, updated_by, published_at)
        OUTPUT INSERTED.*
        VALUES (
          @eventId, @title, @slug, @status, @sortOrder, @createdBy, @createdBy,
          CASE WHEN @status = 'published' THEN SYSUTCDATETIME() ELSE NULL END
        )
      `);
        return mapPage(result.recordset[0]);
    }
    async restorePageForThemeChange(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('title', mssql_1.default.NVarChar(180), input.title)
            .input('slug', mssql_1.default.NVarChar(120), input.slug)
            .input('status', mssql_1.default.NVarChar(30), input.status)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder)
            .input('updatedBy', mssql_1.default.UniqueIdentifier, input.updatedBy)
            .query(`
        UPDATE dbo.event_pages
        SET
          title = @title,
          status = @status,
          sort_order = @sortOrder,
          deleted_at = NULL,
          published_at = CASE
            WHEN @status = 'published' THEN COALESCE(published_at, SYSUTCDATETIME())
            ELSE published_at
          END,
          updated_by = @updatedBy,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = (
          SELECT TOP 1 id
          FROM dbo.event_pages
          WHERE event_id = @eventId
            AND slug = @slug
            AND deleted_at IS NOT NULL
          ORDER BY deleted_at DESC
        )
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.event_pages
            WHERE event_id = @eventId
              AND slug = @slug
              AND deleted_at IS NULL
          )
      `);
        return result.recordset[0] ? mapPage(result.recordset[0]) : null;
    }
    async pageSlugExists(eventId, slug, excludeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('slug', mssql_1.default.NVarChar(120), slug)
            .input('excludeId', mssql_1.default.UniqueIdentifier, excludeId ?? null)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.event_pages
        WHERE event_id = @eventId
          AND slug = @slug
          AND deleted_at IS NULL
          AND (@excludeId IS NULL OR id <> @excludeId)
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async updatePage(eventId, pageId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('pageId', mssql_1.default.UniqueIdentifier, pageId)
            .input('title', mssql_1.default.NVarChar(180), input.title ?? null)
            .input('slug', mssql_1.default.NVarChar(120), input.slug ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .input('updatedBy', mssql_1.default.UniqueIdentifier, input.updatedBy ?? null)
            .query(`
        UPDATE dbo.event_pages
        SET
          title = COALESCE(@title, title),
          slug = COALESCE(@slug, slug),
          status = COALESCE(@status, status),
          sort_order = COALESCE(@sortOrder, sort_order),
          published_at = CASE WHEN @status = 'published' THEN COALESCE(published_at, SYSUTCDATETIME()) ELSE published_at END,
          updated_by = COALESCE(@updatedBy, updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @pageId AND event_id = @eventId AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapPage(result.recordset[0]) : null;
    }
    async findPage(eventId, pageId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('pageId', mssql_1.default.UniqueIdentifier, pageId)
            .query(`
        SELECT TOP 1 *
        FROM dbo.event_pages
        WHERE id = @pageId
          AND event_id = @eventId
          AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapPage(result.recordset[0]) : null;
    }
    async deletePage(eventId, pageId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = new mssql_1.default.Transaction(pool);
        await transaction.begin();
        try {
            const pageResult = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('pageId', mssql_1.default.UniqueIdentifier, pageId)
                .query(`
          SELECT TOP 1 *
          FROM dbo.event_pages WITH (UPDLOCK)
          WHERE id = @pageId
            AND event_id = @eventId
            AND deleted_at IS NULL
        `);
            const page = pageResult.recordset[0];
            if (!page) {
                await transaction.rollback();
                return null;
            }
            if (page.status !== 'draft') {
                await transaction.rollback();
                return { page: mapPage(page), deleted: false };
            }
            await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('pageId', mssql_1.default.UniqueIdentifier, pageId)
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          UPDATE dbo.event_pages
          SET deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
          WHERE id = @pageId AND event_id = @eventId AND deleted_at IS NULL;

          UPDATE dbo.event_page_sections
          SET deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
          WHERE event_id = @eventId AND page_id = @pageId AND deleted_at IS NULL;
        `);
            await transaction.commit();
            return { page: mapPage(page), deleted: true };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async archivePageForThemeChange(eventId, pageId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('pageId', mssql_1.default.UniqueIdentifier, pageId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        UPDATE dbo.event_pages
        SET deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @pageId AND event_id = @eventId AND deleted_at IS NULL;

        UPDATE dbo.event_page_sections
        SET deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
        WHERE event_id = @eventId AND page_id = @pageId AND deleted_at IS NULL;
      `);
        return result.recordset[0] ? mapPage(result.recordset[0]) : null;
    }
    async listSections(eventId, onlyPublished = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyPublished', mssql_1.default.Bit, onlyPublished)
            .query(`
        SELECT * FROM dbo.event_page_sections
        WHERE event_id = @eventId
          AND deleted_at IS NULL
          AND (@onlyPublished = 0 OR status = 'published')
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset.map(mapSection);
    }
    async createSection(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('pageId', mssql_1.default.UniqueIdentifier, input.pageId ?? null)
            .input('sectionType', mssql_1.default.NVarChar(80), input.sectionType)
            .input('title', mssql_1.default.NVarChar(180), input.title ?? null)
            .input('contentJson', mssql_1.default.NVarChar(mssql_1.default.MAX), stringifyJson(input.content))
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'draft')
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 0)
            .input('createdBy', mssql_1.default.UniqueIdentifier, input.createdBy ?? null)
            .query(`
        INSERT INTO dbo.event_page_sections (
          event_id, page_id, section_type, title, content_json, status, sort_order, created_by, updated_by
        )
        OUTPUT INSERTED.*
        VALUES (@eventId, @pageId, @sectionType, @title, @contentJson, @status, @sortOrder, @createdBy, @createdBy)
      `);
        return mapSection(result.recordset[0]);
    }
    async updateSection(eventId, sectionId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('sectionId', mssql_1.default.UniqueIdentifier, sectionId)
            .input('pageId', mssql_1.default.UniqueIdentifier, input.pageId ?? null)
            .input('pageIdProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'pageId'))
            .input('sectionType', mssql_1.default.NVarChar(80), input.sectionType ?? null)
            .input('title', mssql_1.default.NVarChar(180), input.title ?? null)
            .input('titleProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'title'))
            .input('contentJson', mssql_1.default.NVarChar(mssql_1.default.MAX), stringifyJson(input.content))
            .input('contentProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'content'))
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? null)
            .input('updatedBy', mssql_1.default.UniqueIdentifier, input.updatedBy ?? null)
            .query(`
        UPDATE dbo.event_page_sections
        SET
          page_id = CASE WHEN @pageIdProvided = 1 THEN @pageId ELSE page_id END,
          section_type = COALESCE(@sectionType, section_type),
          title = CASE WHEN @titleProvided = 1 THEN @title ELSE title END,
          content_json = CASE WHEN @contentProvided = 1 THEN @contentJson ELSE content_json END,
          status = COALESCE(@status, status),
          sort_order = COALESCE(@sortOrder, sort_order),
          updated_by = COALESCE(@updatedBy, updated_by),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @sectionId AND event_id = @eventId AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapSection(result.recordset[0]) : null;
    }
    async deleteSection(eventId, sectionId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('sectionId', mssql_1.default.UniqueIdentifier, sectionId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        UPDATE dbo.event_page_sections
        SET deleted_at = SYSUTCDATETIME(), updated_by = @userId, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @sectionId AND event_id = @eventId AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapSection(result.recordset[0]) : null;
    }
}
exports.CmsRepository = CmsRepository;
//# sourceMappingURL=cms.repository.js.map