"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteStudioRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function parseJson(value) {
    try {
        return JSON.parse(value || '{}');
    }
    catch {
        return {};
    }
}
function stringify(value) {
    return JSON.stringify(value ?? {});
}
function mapTheme(row) {
    return {
        id: row.id,
        key: row.theme_key,
        name: row.name,
        description: row.description,
        previewImageUrl: row.preview_image_url,
        primaryColor: row.primary_color,
        globalStyles: parseJson(row.global_styles_json),
        template: parseJson(row.template_json),
        isActive: Boolean(row.is_active),
        sortOrder: row.sort_order,
    };
}
function mapPlugin(row) {
    return {
        id: row.id,
        key: row.plugin_key,
        name: row.name,
        description: row.description,
        category: row.category,
        sectionType: row.section_type,
        iconName: row.icon_name,
        defaultTitle: row.default_title,
        defaultContent: parseJson(row.default_content_json),
        isActive: Boolean(row.is_active),
        sortOrder: row.sort_order,
    };
}
function mapSettings(row) {
    return {
        eventId: row.event_id,
        themeId: row.theme_id,
        siteTitle: row.site_title,
        globalStyles: parseJson(row.global_styles_json),
        customCss: row.custom_css,
        status: row.status,
        publishedAt: row.published_at,
        theme: row.theme_id
            ? {
                id: row.theme_id,
                key: row.theme_key,
                name: row.theme_name,
                primaryColor: row.primary_color,
            }
            : null,
    };
}
function mapNavigation(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        label: row.label,
        url: row.url,
        target: row.target,
        sortOrder: row.sort_order,
        isVisible: Boolean(row.is_visible),
    };
}
class SiteStudioRepository {
    async listThemes() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query(`
      SELECT * FROM dbo.site_themes
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `);
        return result.recordset.map(mapTheme);
    }
    async listAllThemes() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query(`
      SELECT * FROM dbo.site_themes
      ORDER BY sort_order ASC, name ASC
    `);
        return result.recordset.map(mapTheme);
    }
    async createTheme(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('key', mssql_1.default.NVarChar(80), input.key)
            .input('name', mssql_1.default.NVarChar(140), input.name)
            .input('description', mssql_1.default.NVarChar(500), input.description ?? null)
            .input('previewImageUrl', mssql_1.default.NVarChar(500), input.previewImageUrl ?? null)
            .input('primaryColor', mssql_1.default.NVarChar(30), input.primaryColor)
            .input('globalStyles', mssql_1.default.NVarChar(mssql_1.default.MAX), stringify(input.globalStyles))
            .input('template', mssql_1.default.NVarChar(mssql_1.default.MAX), stringify(input.template))
            .input('isActive', mssql_1.default.Bit, input.isActive ?? true)
            .input('sortOrder', mssql_1.default.Int, input.sortOrder ?? 100)
            .query(`
        IF EXISTS (SELECT 1 FROM dbo.site_themes WHERE theme_key = @key)
        BEGIN
          UPDATE dbo.site_themes
          SET
            name = @name,
            description = @description,
            preview_image_url = @previewImageUrl,
            primary_color = @primaryColor,
            global_styles_json = @globalStyles,
            template_json = @template,
            is_active = @isActive,
            sort_order = @sortOrder,
            updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE theme_key = @key
        END
        ELSE
        BEGIN
          INSERT INTO dbo.site_themes (
            theme_key, name, description, preview_image_url, primary_color,
            global_styles_json, template_json, is_active, sort_order
          )
          OUTPUT INSERTED.*
          VALUES (
            @key, @name, @description, @previewImageUrl, @primaryColor,
            @globalStyles, @template, @isActive, @sortOrder
          )
        END
      `);
        return mapTheme(result.recordset[0]);
    }
    async listPlugins() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query(`
      SELECT * FROM dbo.site_plugins
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `);
        return result.recordset.map(mapPlugin);
    }
    async findTheme(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('id', mssql_1.default.UniqueIdentifier, id).query(`
      SELECT TOP 1 * FROM dbo.site_themes WHERE id = @id AND is_active = 1
    `);
        return result.recordset[0] ? mapTheme(result.recordset[0]) : null;
    }
    async findPlugin(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('id', mssql_1.default.UniqueIdentifier, id).query(`
      SELECT TOP 1 * FROM dbo.site_plugins WHERE id = @id AND is_active = 1
    `);
        return result.recordset[0] ? mapPlugin(result.recordset[0]) : null;
    }
    async getSettings(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).query(`
      IF NOT EXISTS (SELECT 1 FROM dbo.event_site_settings WHERE event_id = @eventId)
      BEGIN
        INSERT INTO dbo.event_site_settings (event_id) VALUES (@eventId)
      END
    `);
        const result = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).query(`
      SELECT s.*, t.theme_key, t.name AS theme_name, t.primary_color
      FROM dbo.event_site_settings s
      LEFT JOIN dbo.site_themes t ON t.id = s.theme_id
      WHERE s.event_id = @eventId
    `);
        return mapSettings(result.recordset[0]);
    }
    async updateSettings(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        await this.getSettings(eventId);
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('siteTitle', mssql_1.default.NVarChar(180), input.siteTitle ?? null)
            .input('themeId', mssql_1.default.UniqueIdentifier, input.themeId ?? null)
            .input('themeIdProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'themeId'))
            .input('globalStyles', mssql_1.default.NVarChar(mssql_1.default.MAX), stringify(input.globalStyles))
            .input('globalStylesProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'globalStyles'))
            .input('customCss', mssql_1.default.NVarChar(mssql_1.default.MAX), input.customCss ?? null)
            .input('customCssProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'customCss'))
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .query(`
        UPDATE dbo.event_site_settings
        SET
          site_title = COALESCE(@siteTitle, site_title),
          theme_id = CASE WHEN @themeIdProvided = 1 THEN @themeId ELSE theme_id END,
          global_styles_json = CASE WHEN @globalStylesProvided = 1 THEN @globalStyles ELSE global_styles_json END,
          custom_css = CASE WHEN @customCssProvided = 1 THEN @customCss ELSE custom_css END,
          status = COALESCE(@status, status),
          published_at = CASE WHEN @status = 'published' THEN COALESCE(published_at, SYSUTCDATETIME()) ELSE published_at END,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*, NULL AS theme_key, NULL AS theme_name, NULL AS primary_color
        WHERE event_id = @eventId
      `);
        return this.getSettings(result.recordset[0].event_id);
    }
    async listInstalledPlugins(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).query(`
      SELECT p.*
      FROM dbo.site_plugins p
      INNER JOIN dbo.event_site_plugin_installs i ON i.plugin_id = p.id
      WHERE i.event_id = @eventId AND i.status = 'active'
      ORDER BY p.sort_order ASC
    `);
        return result.recordset.map(mapPlugin);
    }
    async installPlugin(eventId, pluginId, userId) {
        const plugin = await this.findPlugin(pluginId);
        if (!plugin)
            return null;
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('pluginId', mssql_1.default.UniqueIdentifier, pluginId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.event_site_plugin_installs WHERE event_id = @eventId AND plugin_id = @pluginId)
        BEGIN
          INSERT INTO dbo.event_site_plugin_installs (event_id, plugin_id, installed_by)
          VALUES (@eventId, @pluginId, @userId)
        END
        ELSE
        BEGIN
          UPDATE dbo.event_site_plugin_installs
          SET status = 'active', installed_by = @userId, updated_at = SYSUTCDATETIME()
          WHERE event_id = @eventId AND plugin_id = @pluginId
        END
      `);
        return plugin;
    }
    async listNavigation(eventId, onlyVisible = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('onlyVisible', mssql_1.default.Bit, onlyVisible)
            .query(`
        SELECT * FROM dbo.event_site_navigation_items
        WHERE event_id = @eventId AND (@onlyVisible = 0 OR is_visible = 1)
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset.map(mapNavigation);
    }
    async snapshot(eventId, revisionType, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const snapshot = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).query(`
      SELECT
        (SELECT * FROM dbo.event_site_settings WHERE event_id = @eventId FOR JSON PATH) AS settings,
        (SELECT * FROM dbo.event_pages WHERE event_id = @eventId AND deleted_at IS NULL FOR JSON PATH) AS pages,
        (SELECT * FROM dbo.event_page_sections WHERE event_id = @eventId AND deleted_at IS NULL FOR JSON PATH) AS blocks,
        (SELECT * FROM dbo.event_site_navigation_items WHERE event_id = @eventId FOR JSON PATH) AS navigation
    `);
        await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('revisionType', mssql_1.default.NVarChar(50), revisionType)
            .input('snapshot', mssql_1.default.NVarChar(mssql_1.default.MAX), stringify(snapshot.recordset[0] ?? {}))
            .input('userId', mssql_1.default.UniqueIdentifier, userId ?? null)
            .query(`
        INSERT INTO dbo.event_site_revisions (event_id, revision_type, snapshot_json, created_by)
        VALUES (@eventId, @revisionType, @snapshot, @userId)
      `);
    }
}
exports.SiteStudioRepository = SiteStudioRepository;
//# sourceMappingURL=site-studio.repository.js.map