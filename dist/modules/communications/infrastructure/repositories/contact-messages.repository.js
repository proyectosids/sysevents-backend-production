"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactMessagesRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function mapContactMessage(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        name: row.name,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        readAt: row.read_at,
        archivedAt: row.archived_at,
    };
}
class ContactMessagesRepository {
    async create(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
            .input('name', mssql_1.default.NVarChar(160), input.name)
            .input('email', mssql_1.default.NVarChar(255), input.email)
            .input('subject', mssql_1.default.NVarChar(255), input.subject)
            .input('message', mssql_1.default.NVarChar(mssql_1.default.MAX), input.message)
            .input('ipAddress', mssql_1.default.NVarChar(64), input.ipAddress ?? null)
            .input('userAgent', mssql_1.default.NVarChar(500), input.userAgent ?? null)
            .query(`
        INSERT INTO dbo.event_contact_messages (
          event_id, name, email, subject, message, ip_address, user_agent
        )
        OUTPUT INSERTED.*
        VALUES (@eventId, @name, @email, @subject, @message, @ipAddress, @userAgent)
      `);
        return mapContactMessage(result.recordset[0]);
    }
    async listByEvent(eventId, status) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('status', mssql_1.default.NVarChar(20), status ?? null)
            .query(`
        SELECT id, event_id, name, email, subject, message, status, created_at, read_at, archived_at
        FROM dbo.event_contact_messages
        WHERE event_id = @eventId
          AND (@status IS NULL OR status = @status)
        ORDER BY created_at DESC
      `);
        return result.recordset.map(mapContactMessage);
    }
    async updateStatus(eventId, id, status) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('status', mssql_1.default.NVarChar(20), status)
            .query(`
        UPDATE dbo.event_contact_messages
        SET status = @status,
            read_at = CASE WHEN @status = 'read' AND read_at IS NULL THEN SYSUTCDATETIME() ELSE read_at END,
            archived_at = CASE WHEN @status = 'archived' THEN SYSUTCDATETIME() ELSE NULL END
        OUTPUT INSERTED.*
        WHERE id = @id AND event_id = @eventId;
      `);
        return result.recordset[0] ? mapContactMessage(result.recordset[0]) : null;
    }
}
exports.ContactMessagesRepository = ContactMessagesRepository;
//# sourceMappingURL=contact-messages.repository.js.map