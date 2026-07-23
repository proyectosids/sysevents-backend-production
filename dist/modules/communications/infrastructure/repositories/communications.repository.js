"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function mapTemplate(row) {
    return {
        id: row.id,
        templateKey: row.template_key,
        subject: row.subject,
        body: row.body,
        isActive: Boolean(row.is_active),
    };
}
class CommunicationsRepository {
    async listTemplates() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .query('SELECT * FROM dbo.email_templates ORDER BY template_key ASC');
        return result.recordset.map(mapTemplate);
    }
    async findTemplateByKey(templateKey) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('templateKey', mssql_1.default.NVarChar(100), templateKey)
            .query('SELECT TOP 1 * FROM dbo.email_templates WHERE template_key = @templateKey');
        return result.recordset[0] ? mapTemplate(result.recordset[0]) : null;
    }
    async updateTemplate(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('subject', mssql_1.default.NVarChar(255), input.subject ?? null)
            .input('body', mssql_1.default.NVarChar(mssql_1.default.MAX), input.body ?? null)
            .input('isActive', mssql_1.default.Bit, input.isActive ?? null)
            .query(`
        UPDATE dbo.email_templates
        SET subject = COALESCE(@subject, subject),
            body = COALESCE(@body, body),
            is_active = COALESCE(@isActive, is_active),
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        return result.recordset[0] ? mapTemplate(result.recordset[0]) : null;
    }
    async createEmailLog(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('templateKey', mssql_1.default.NVarChar(100), input.templateKey)
            .input('recipientEmail', mssql_1.default.NVarChar(255), input.recipientEmail)
            .input('subject', mssql_1.default.NVarChar(255), input.subject)
            .query(`
        INSERT INTO dbo.email_logs (template_key, recipient_email, subject)
        OUTPUT INSERTED.id
        VALUES (@templateKey, @recipientEmail, @subject)
      `);
        return result.recordset[0].id;
    }
    async updateEmailLog(id, status, errorMessage) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('status', mssql_1.default.NVarChar(40), status)
            .input('errorMessage', mssql_1.default.NVarChar(mssql_1.default.MAX), errorMessage ?? null)
            .query(`
        UPDATE dbo.email_logs
        SET status = @status,
            error_message = @errorMessage,
            sent_at = CASE WHEN @status = 'sent' THEN SYSUTCDATETIME() ELSE sent_at END
        WHERE id = @id
      `);
    }
    async listEmailLogs() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .query('SELECT TOP 200 * FROM dbo.email_logs ORDER BY created_at DESC');
        return result.recordset;
    }
    async createNotification(input) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId ?? null)
            .input('recipientEmail', mssql_1.default.NVarChar(255), input.recipientEmail ?? null)
            .input('type', mssql_1.default.NVarChar(100), input.type)
            .input('title', mssql_1.default.NVarChar(255), input.title)
            .input('message', mssql_1.default.NVarChar(mssql_1.default.MAX), input.message)
            .query(`
        INSERT INTO dbo.notifications (user_id, recipient_email, type, title, message)
        VALUES (@userId, @recipientEmail, @type, @title, @message)
      `);
    }
}
exports.CommunicationsRepository = CommunicationsRepository;
//# sourceMappingURL=communications.repository.js.map