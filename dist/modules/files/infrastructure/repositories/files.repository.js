"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilesRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function mapFile(row) {
    return {
        id: row.id,
        categoryId: row.category_id,
        categoryName: row.category_name ?? null,
        tenantId: row.tenant_id,
        eventId: row.event_id,
        ownerUserId: row.owner_user_id,
        originalName: row.original_name,
        storedName: row.stored_name,
        storagePath: row.storage_path,
        mimeType: row.mime_type,
        sizeBytes: Number(row.size_bytes),
        checksumSha256: row.checksum_sha256,
        status: row.status,
        createdAt: row.created_at,
    };
}
class FilesRepository {
    async findCategoryIdByName(name) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('name', mssql_1.default.NVarChar(100), name)
            .query('SELECT TOP 1 id FROM dbo.file_categories WHERE name = @name');
        return result.recordset[0]?.id ?? null;
    }
    async findOrCreateCategoryIdByName(name) {
        const existing = await this.findCategoryIdByName(name);
        if (existing)
            return existing;
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('name', mssql_1.default.NVarChar(100), name)
            .input('description', mssql_1.default.NVarChar(255), humanizeCategoryName(name))
            .query(`
        INSERT INTO dbo.file_categories (name, description)
        OUTPUT INSERTED.id
        VALUES (@name, @description)
      `);
        return result.recordset[0]?.id ?? null;
    }
    async createFile(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('categoryId', mssql_1.default.UniqueIdentifier, input.categoryId ?? null)
            .input('tenantId', mssql_1.default.UniqueIdentifier, input.tenantId ?? null)
            .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId ?? null)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, input.ownerUserId ?? null)
            .input('originalName', mssql_1.default.NVarChar(255), input.originalName)
            .input('storedName', mssql_1.default.NVarChar(255), input.storedName)
            .input('storagePath', mssql_1.default.NVarChar(1000), input.storagePath)
            .input('mimeType', mssql_1.default.NVarChar(150), input.mimeType)
            .input('sizeBytes', mssql_1.default.BigInt, input.sizeBytes)
            .input('checksumSha256', mssql_1.default.NVarChar(64), input.checksumSha256)
            .query(`
        INSERT INTO dbo.files (
          category_id, tenant_id, event_id, owner_user_id, original_name, stored_name,
          storage_path, mime_type, size_bytes, checksum_sha256
        )
        OUTPUT INSERTED.*
        VALUES (
          @categoryId, @tenantId, @eventId, @ownerUserId, @originalName, @storedName,
          @storagePath, @mimeType, @sizeBytes, @checksumSha256
        )
      `);
        return mapFile(result.recordset[0]);
    }
    async findById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`
        SELECT TOP 1 f.*, fc.name AS category_name
        FROM dbo.files f
        LEFT JOIN dbo.file_categories fc ON fc.id = f.category_id
        WHERE f.id = @id AND f.deleted_at IS NULL AND f.status = 'active'
      `);
        return result.recordset[0] ? mapFile(result.recordset[0]) : null;
    }
    async listFiles(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId ?? null)
            .input('tenantId', mssql_1.default.UniqueIdentifier, input.tenantId ?? null)
            .input('mimePrefix', mssql_1.default.NVarChar(80), input.mimePrefix ?? null)
            .query(`
        SELECT TOP 100 f.*, fc.name AS category_name
        FROM dbo.files f
        LEFT JOIN dbo.file_categories fc ON fc.id = f.category_id
        WHERE f.deleted_at IS NULL
          AND f.status = 'active'
          AND (@eventId IS NULL OR f.event_id = @eventId)
          AND (@tenantId IS NULL OR f.tenant_id = @tenantId)
          AND (@mimePrefix IS NULL OR f.mime_type LIKE @mimePrefix + '%')
        ORDER BY f.created_at DESC
      `);
        return result.recordset.map(mapFile);
    }
    async softDelete(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`
        UPDATE dbo.files
        SET status = 'deleted', deleted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND deleted_at IS NULL
      `);
        return result.recordset[0] ? mapFile(result.recordset[0]) : null;
    }
    async isPublicMaterial(fileId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('fileId', mssql_1.default.UniqueIdentifier, fileId)
            .query(`
        IF OBJECT_ID('dbo.event_materials', 'U') IS NULL
        BEGIN
          SELECT CAST(0 AS INT) AS total;
          RETURN;
        END;

        SELECT COUNT(1) AS total
        FROM dbo.event_materials
        WHERE file_id = @fileId AND visibility = 'public' AND is_active = 1
          AND NOT EXISTS (
            SELECT 1 FROM dbo.event_material_role_targets target
            WHERE target.material_id = dbo.event_materials.id
          )
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async canUserDownloadEventMaterial(fileId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('fileId', mssql_1.default.UniqueIdentifier, fileId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        IF OBJECT_ID('dbo.event_materials', 'U') IS NULL
        BEGIN
          SELECT CAST(0 AS INT) AS total;
          RETURN;
        END;

        SELECT COUNT(DISTINCT m.id) AS total
        FROM dbo.event_materials m
        WHERE m.file_id = @fileId
          AND m.is_active = 1
          AND (
            (
              NOT EXISTS (SELECT 1 FROM dbo.event_material_role_targets target WHERE target.material_id = m.id)
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
            )
            OR EXISTS (
              SELECT 1 FROM dbo.event_material_role_targets target
              WHERE target.material_id = m.id
                AND (
                  (target.role_key = 'supervisor' AND EXISTS (
                    SELECT 1 FROM dbo.event_program_staff_assignments staff
                    WHERE staff.event_id = m.event_id AND staff.user_id = @userId AND staff.staff_role = 'supervisor' AND staff.is_active = 1
                      AND (m.program_id IS NULL OR staff.program_id IS NULL OR staff.program_id = m.program_id)
                  ))
                  OR (target.role_key = 'evaluator' AND EXISTS (
                    SELECT 1 FROM dbo.event_program_staff_assignments staff
                    WHERE staff.event_id = m.event_id AND staff.user_id = @userId AND staff.staff_role = 'evaluator' AND staff.is_active = 1
                      AND (m.program_id IS NULL OR staff.program_id IS NULL OR staff.program_id = m.program_id)
                  ))
                  OR (target.role_key = 'leader' AND EXISTS (
                    SELECT 1 FROM dbo.event_review_teams team
                    WHERE team.event_id = m.event_id AND team.leader_user_id = @userId AND team.is_active = 1
                      AND (m.program_id IS NULL OR team.program_id = m.program_id)
                  ))
                  OR (target.role_key = 'reviewer' AND EXISTS (
                    SELECT 1 FROM dbo.event_review_team_members member
                    INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
                    WHERE team.event_id = m.event_id AND member.user_id = @userId AND member.is_active = 1
                      AND (m.program_id IS NULL OR team.program_id = m.program_id)
                  ))
                  OR (target.role_key = 'participant' AND EXISTS (
                    SELECT 1 FROM dbo.event_registrations registration
                    WHERE registration.event_id = m.event_id AND registration.user_id = @userId AND registration.status <> 'cancelled'
                      AND (m.program_id IS NULL OR registration.program_id = m.program_id)
                  ))
                  OR (target.role_key = 'speaker' AND EXISTS (
                    SELECT 1 FROM dbo.event_registrations registration
                    WHERE registration.event_id = m.event_id AND registration.user_id = @userId
                      AND registration.status <> 'cancelled' AND registration.participation_mode = 'presenter'
                      AND (m.program_id IS NULL OR registration.program_id = m.program_id)
                  ))
                  OR (target.role_key IN ('advisor', 'team_member') AND EXISTS (
                    SELECT 1 FROM dbo.event_registration_team_members team_member
                    INNER JOIN dbo.event_registrations registration ON registration.id = team_member.registration_id
                    INNER JOIN dbo.users requesting_user ON requesting_user.id = @userId AND requesting_user.email = team_member.email
                    WHERE registration.event_id = m.event_id AND registration.status <> 'cancelled' AND team_member.role = target.role_key
                      AND (m.program_id IS NULL OR registration.program_id = m.program_id)
                  ))
                  OR (target.role_key = 'keynote_speaker' AND EXISTS (
                    SELECT 1 FROM dbo.event_speakers speaker
                    INNER JOIN dbo.users requesting_user ON requesting_user.id = @userId AND requesting_user.email = speaker.email
                    WHERE speaker.event_id = m.event_id AND speaker.status = 'published'
                      AND speaker.source_registration_id IS NULL AND m.program_id IS NULL
                  ))
                )
            )
          )
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async isEventMaterialFile(fileId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('fileId', mssql_1.default.UniqueIdentifier, fileId)
            .query('SELECT COUNT(1) AS total FROM dbo.event_materials WHERE file_id = @fileId AND is_active = 1');
        return (result.recordset[0]?.total ?? 0) > 0;
    }
}
exports.FilesRepository = FilesRepository;
function humanizeCategoryName(name) {
    return name
        .split(/[_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
//# sourceMappingURL=files.repository.js.map