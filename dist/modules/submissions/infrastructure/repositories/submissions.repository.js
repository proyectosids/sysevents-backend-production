"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmissionsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
function mapSubmission(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        submissionTypeId: row.submission_type_id,
        programId: row.program_id,
        knowledgeAreaId: row.knowledge_area_id,
        knowledgeLineId: row.knowledge_line_id,
        registrationId: row.registration_id,
        ownerUserId: row.owner_user_id,
        submissionTypeName: row.submission_type_name ?? null,
        programName: row.program_name ?? null,
        knowledgeAreaName: row.knowledge_area_name ?? null,
        knowledgeLineName: row.knowledge_line_name ?? null,
        latestDecisionNotes: row.latest_decision_notes ?? null,
        latestDecision: row.latest_decision ?? null,
        primaryAuthorName: row.primary_author_name ?? null,
        primaryAuthorEmail: row.primary_author_email ?? null,
        title: row.title,
        abstract: row.abstract,
        videoUrl: row.video_url,
        keywords: row.keywords,
        status: row.status,
        submittedAt: row.submitted_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
class SubmissionsRepository {
    async listSubmissionTypes(eventId, programId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, programId ?? null)
            .query(`
        SELECT id, event_id AS eventId, program_id AS programId, name, description, requires_file AS requiresFile,
          is_active AS isActive, sort_order AS sortOrder
        FROM dbo.submission_types
        WHERE event_id = @eventId AND is_active = 1
          AND (@programId IS NULL OR program_id = @programId)
        ORDER BY sort_order ASC, created_at ASC
      `);
        return result.recordset;
    }
    async createSubmissionType(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('name', mssql_1.default.NVarChar(120), input.name)
            .input('description', mssql_1.default.NVarChar(255), input.description ?? null)
            .input('requiresFile', mssql_1.default.Bit, input.requiresFile ?? true)
            .query('INSERT INTO dbo.submission_types (event_id, program_id, name, description, requires_file) OUTPUT INSERTED.* VALUES (@eventId, @programId, @name, @description, @requiresFile)');
        return result.recordset[0];
    }
    async deactivateSubmissionType(eventId, typeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('typeId', mssql_1.default.UniqueIdentifier, typeId)
            .query(`
        UPDATE dbo.submission_types
        SET is_active = 0, updated_at = SYSUTCDATETIME()
        WHERE id = @typeId AND event_id = @eventId AND is_active = 1
      `);
        return (result.rowsAffected[0] ?? 0) > 0;
    }
    async findSubmissionType(eventId, submissionTypeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('submissionTypeId', mssql_1.default.UniqueIdentifier, submissionTypeId)
            .query(`
        SELECT TOP 1 id, program_id, requires_file, is_active FROM dbo.submission_types
        WHERE id = @submissionTypeId AND event_id = @eventId
      `);
        return result.recordset[0] ?? null;
    }
    async createSubmission(input) {
        const submissionType = await this.findSubmissionType(input.eventId, input.submissionTypeId);
        if (!submissionType || !submissionType.is_active) {
            throw new app_error_1.AppError('Submission type not found', 404, 'SUBMISSION_TYPE_NOT_FOUND');
        }
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            if (input.registrationId) {
                const registration = await transaction
                    .request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, input.registrationId)
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('ownerUserId', mssql_1.default.UniqueIdentifier, input.ownerUserId)
                    .query(`
            SELECT program_id
            FROM dbo.event_registrations
            WHERE id = @registrationId AND event_id = @eventId AND user_id = @ownerUserId
          `);
                const linkedRegistration = registration.recordset[0];
                if (!linkedRegistration) {
                    throw new app_error_1.AppError('Registration does not belong to participant', 403, 'REGISTRATION_FORBIDDEN');
                }
                if ((linkedRegistration.program_id ?? null) !== (submissionType.program_id ?? null)) {
                    throw new app_error_1.AppError('La modalidad del trabajo no pertenece al programa del registro.', 400, 'SUBMISSION_PROGRAM_MISMATCH');
                }
            }
            if (input.knowledgeAreaId || input.knowledgeLineId) {
                await this.validateKnowledgeSelection(transaction, input.eventId, input.knowledgeAreaId ?? null, input.knowledgeLineId ?? null);
            }
            const result = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('submissionTypeId', mssql_1.default.UniqueIdentifier, input.submissionTypeId)
                .input('programId', mssql_1.default.UniqueIdentifier, submissionType.program_id ?? null)
                .input('knowledgeAreaId', mssql_1.default.UniqueIdentifier, input.knowledgeAreaId ?? null)
                .input('knowledgeLineId', mssql_1.default.UniqueIdentifier, input.knowledgeLineId ?? null)
                .input('registrationId', mssql_1.default.UniqueIdentifier, input.registrationId ?? null)
                .input('ownerUserId', mssql_1.default.UniqueIdentifier, input.ownerUserId)
                .input('title', mssql_1.default.NVarChar(250), input.title)
                .input('abstract', mssql_1.default.NVarChar(mssql_1.default.MAX), input.abstract ?? null)
                .input('videoUrl', mssql_1.default.NVarChar(1000), input.videoUrl ?? null)
                .input('keywords', mssql_1.default.NVarChar(500), input.keywords ?? null)
                .query(`
          INSERT INTO dbo.submissions (event_id, submission_type_id, program_id, knowledge_area_id, knowledge_line_id, registration_id, owner_user_id, title, abstract, video_url, keywords)
          OUTPUT INSERTED.*
          VALUES (@eventId, @submissionTypeId, @programId, @knowledgeAreaId, @knowledgeLineId, @registrationId, @ownerUserId, @title, @abstract, @videoUrl, @keywords)
        `);
            const submission = mapSubmission(result.recordset[0]);
            for (let index = 0; index < input.authors.length; index += 1) {
                const author = input.authors[index];
                await transaction
                    .request()
                    .input('submissionId', mssql_1.default.UniqueIdentifier, submission.id)
                    .input('fullName', mssql_1.default.NVarChar(180), author.fullName)
                    .input('email', mssql_1.default.NVarChar(255), author.email)
                    .input('affiliation', mssql_1.default.NVarChar(180), author.affiliation ?? null)
                    .input('isCorresponding', mssql_1.default.Bit, author.isCorresponding ?? index === 0)
                    .input('sortOrder', mssql_1.default.Int, index)
                    .query(`
            INSERT INTO dbo.submission_authors (submission_id, full_name, email, affiliation, is_corresponding, sort_order)
            VALUES (@submissionId, @fullName, @email, @affiliation, @isCorresponding, @sortOrder)
          `);
            }
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, submission.id)
                .query("INSERT INTO dbo.submission_status_history (submission_id, to_status, reason) VALUES (@submissionId, 'draft', 'submission_created')");
            await transaction.commit();
            return submission;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async findById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`
        SELECT TOP 1 s.*, st.name AS submission_type_name, p.name AS program_name,
          area.name AS knowledge_area_name, line.name AS knowledge_line_name,
          decision.decision_notes AS latest_decision_notes, decision.decision AS latest_decision,
          author.full_name AS primary_author_name, author.email AS primary_author_email
        FROM dbo.submissions s
        INNER JOIN dbo.submission_types st ON st.id = s.submission_type_id
        LEFT JOIN dbo.event_programs p ON p.id = s.program_id
        LEFT JOIN dbo.event_knowledge_areas area ON area.id = s.knowledge_area_id
        LEFT JOIN dbo.event_knowledge_lines line ON line.id = s.knowledge_line_id
        OUTER APPLY (SELECT TOP 1 decision, decision_notes FROM dbo.review_decisions WHERE submission_id = s.id ORDER BY created_at DESC) decision
        OUTER APPLY (SELECT TOP 1 full_name, email FROM dbo.submission_authors WHERE submission_id = s.id ORDER BY is_corresponding DESC, sort_order ASC) author
        WHERE s.id = @id AND s.deleted_at IS NULL
      `);
        return result.recordset[0] ? mapSubmission(result.recordset[0]) : null;
    }
    async listMine(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT s.*, st.name AS submission_type_name, p.name AS program_name,
          area.name AS knowledge_area_name, line.name AS knowledge_line_name,
          decision.decision_notes AS latest_decision_notes, decision.decision AS latest_decision,
          author.full_name AS primary_author_name, author.email AS primary_author_email
        FROM dbo.submissions s
        INNER JOIN dbo.submission_types st ON st.id = s.submission_type_id
        LEFT JOIN dbo.event_programs p ON p.id = s.program_id
        LEFT JOIN dbo.event_knowledge_areas area ON area.id = s.knowledge_area_id
        LEFT JOIN dbo.event_knowledge_lines line ON line.id = s.knowledge_line_id
        OUTER APPLY (SELECT TOP 1 decision, decision_notes FROM dbo.review_decisions WHERE submission_id = s.id ORDER BY created_at DESC) decision
        OUTER APPLY (SELECT TOP 1 full_name, email FROM dbo.submission_authors WHERE submission_id = s.id ORDER BY is_corresponding DESC, sort_order ASC) author
        WHERE s.owner_user_id = @userId AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
      `);
        return result.recordset.map(mapSubmission);
    }
    async listByEvent(eventId, filters = {}) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, filters.programId ?? null)
            .input('submissionTypeId', mssql_1.default.UniqueIdentifier, filters.submissionTypeId ?? null)
            .input('status', mssql_1.default.NVarChar(40), filters.status ?? null)
            .input('leaderUserId', mssql_1.default.UniqueIdentifier, filters.leaderUserId ?? null)
            .query(`
        SELECT s.*, st.name AS submission_type_name, p.name AS program_name,
          area.name AS knowledge_area_name, line.name AS knowledge_line_name,
          decision.decision_notes AS latest_decision_notes, decision.decision AS latest_decision,
          author.full_name AS primary_author_name, author.email AS primary_author_email
        FROM dbo.submissions s
        INNER JOIN dbo.submission_types st ON st.id = s.submission_type_id
        LEFT JOIN dbo.event_programs p ON p.id = s.program_id
        LEFT JOIN dbo.event_knowledge_areas area ON area.id = s.knowledge_area_id
        LEFT JOIN dbo.event_knowledge_lines line ON line.id = s.knowledge_line_id
        OUTER APPLY (SELECT TOP 1 decision, decision_notes FROM dbo.review_decisions WHERE submission_id = s.id ORDER BY created_at DESC) decision
        OUTER APPLY (SELECT TOP 1 full_name, email FROM dbo.submission_authors WHERE submission_id = s.id ORDER BY is_corresponding DESC, sort_order ASC) author
        WHERE s.event_id = @eventId AND s.deleted_at IS NULL
          AND (@programId IS NULL OR s.program_id = @programId)
          AND (@submissionTypeId IS NULL OR s.submission_type_id = @submissionTypeId)
          AND (@status IS NULL OR s.status = @status)
          AND (
            @leaderUserId IS NULL
            OR EXISTS (
              SELECT 1
              FROM dbo.event_program_review_team_members member
              WHERE member.program_id = s.program_id
                AND member.user_id = @leaderUserId
                AND member.team_role = 'leader'
            )
          )
        ORDER BY s.created_at DESC
      `);
        return result.recordset.map(mapSubmission);
    }
    async updateSubmission(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const current = await this.findById(id);
        if (!current)
            return null;
        if (Object.prototype.hasOwnProperty.call(input, 'knowledgeAreaId') || Object.prototype.hasOwnProperty.call(input, 'knowledgeLineId')) {
            const transaction = pool.transaction();
            await transaction.begin();
            try {
                await this.validateKnowledgeSelection(transaction, current.eventId, input.knowledgeAreaId ?? null, input.knowledgeLineId ?? null);
                await transaction.commit();
            }
            catch (error) {
                await transaction.rollback();
                throw error;
            }
        }
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('title', mssql_1.default.NVarChar(250), input.title ?? null)
            .input('knowledgeAreaId', mssql_1.default.UniqueIdentifier, input.knowledgeAreaId ?? null)
            .input('knowledgeAreaProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'knowledgeAreaId'))
            .input('knowledgeLineId', mssql_1.default.UniqueIdentifier, input.knowledgeLineId ?? null)
            .input('knowledgeLineProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'knowledgeLineId'))
            .input('abstract', mssql_1.default.NVarChar(mssql_1.default.MAX), input.abstract ?? null)
            .input('abstractProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'abstract'))
            .input('videoUrl', mssql_1.default.NVarChar(1000), input.videoUrl ?? null)
            .input('videoUrlProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'videoUrl'))
            .input('keywords', mssql_1.default.NVarChar(500), input.keywords ?? null)
            .input('keywordsProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'keywords'))
            .query(`
        UPDATE dbo.submissions
        SET title = COALESCE(@title, title),
            knowledge_area_id = CASE WHEN @knowledgeAreaProvided = 1 THEN @knowledgeAreaId ELSE knowledge_area_id END,
            knowledge_line_id = CASE WHEN @knowledgeLineProvided = 1 THEN @knowledgeLineId ELSE knowledge_line_id END,
            abstract = CASE WHEN @abstractProvided = 1 THEN @abstract ELSE abstract END,
            video_url = CASE WHEN @videoUrlProvided = 1 THEN @videoUrl ELSE video_url END,
            keywords = CASE WHEN @keywordsProvided = 1 THEN @keywords ELSE keywords END,
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id AND status IN ('draft', 'changes_requested')
      `);
        return result.recordset[0] ? mapSubmission(result.recordset[0]) : null;
    }
    async attachFile(submissionId, fileId, fileRole = 'manuscript', uploadedBy) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
                .input('fileId', mssql_1.default.UniqueIdentifier, fileId)
                .input('fileRole', mssql_1.default.NVarChar(60), fileRole)
                .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.submission_files WHERE submission_id = @submissionId AND file_id = @fileId)
          INSERT INTO dbo.submission_files (submission_id, file_id, file_role) VALUES (@submissionId, @fileId, @fileRole)
      `);
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
                .input('fileId', mssql_1.default.UniqueIdentifier, fileId)
                .input('fileRole', mssql_1.default.NVarChar(60), fileRole)
                .input('uploadedBy', mssql_1.default.UniqueIdentifier, uploadedBy ?? null)
                .query(`
          INSERT INTO dbo.submission_file_versions (submission_id, file_id, file_role, version_number, uploaded_by)
          SELECT @submissionId, @fileId, @fileRole,
            COALESCE((SELECT MAX(version_number) FROM dbo.submission_file_versions WHERE submission_id = @submissionId AND file_role = @fileRole), 0) + 1,
            @uploadedBy
        `);
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async listFiles(submissionId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT stored_file.id, stored_file.original_name AS originalName, stored_file.mime_type AS mimeType,
          stored_file.size_bytes AS sizeBytes, submission_file.file_role AS fileRole,
          submission_file.created_at AS uploadedAt
        FROM dbo.submission_files submission_file
        INNER JOIN dbo.files stored_file ON stored_file.id = submission_file.file_id AND stored_file.status = 'active'
        WHERE submission_file.submission_id = @submissionId
        ORDER BY CASE submission_file.file_role WHEN 'corrected_manuscript' THEN 0 WHEN 'manuscript' THEN 1 WHEN 'abstract' THEN 2 ELSE 3 END,
          submission_file.created_at DESC
      `);
        return result.recordset;
    }
    async submit(id, changedBy, resubmission = false) {
        const submission = await this.findById(id);
        if (!submission)
            return null;
        if (!['draft', 'changes_requested'].includes(submission.status)) {
            throw new app_error_1.AppError('Submission cannot be submitted in its current status', 409, 'SUBMISSION_INVALID_STATUS');
        }
        const pool = await (0, database_1.getSqlPool)();
        const requirements = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`
        SELECT st.requires_file,
          JSON_VALUE(p.settings_json, '$.fullSubmissionType') AS full_submission_type,
          (SELECT COUNT(1) FROM dbo.submission_files sf WHERE sf.submission_id = s.id) AS files_count,
          (SELECT COUNT(1) FROM dbo.submission_files sf WHERE sf.submission_id = s.id AND sf.file_role IN ('manuscript', 'corrected_manuscript')) AS manuscript_files_count,
          (SELECT COUNT(1) FROM dbo.submission_files sf WHERE sf.submission_id = s.id AND sf.file_role = 'abstract') AS summary_files_count,
          (SELECT COUNT(1) FROM dbo.submission_authors sa WHERE sa.submission_id = s.id) AS authors_count
        FROM dbo.submissions s
        INNER JOIN dbo.submission_types st ON st.id = s.submission_type_id
        LEFT JOIN dbo.event_programs p ON p.id = s.program_id
        WHERE s.id = @id
      `);
        const row = requirements.recordset[0];
        if (!submission.title || (!submission.abstract && row.summary_files_count < 1) || row.authors_count < 1) {
            throw new app_error_1.AppError('Submission is missing required fields', 400, 'SUBMISSION_INCOMPLETE');
        }
        const fullSubmissionType = row.full_submission_type === 'video_url'
            ? 'video_url'
            : row.full_submission_type === 'none'
                ? 'none'
                : 'file';
        if (row.requires_file && fullSubmissionType === 'file' && row.manuscript_files_count < 1) {
            throw new app_error_1.AppError('Submission requires at least one file', 400, 'SUBMISSION_FILE_REQUIRED');
        }
        if (row.requires_file && fullSubmissionType === 'video_url' && !submission.videoUrl) {
            throw new app_error_1.AppError('Submission requires a video URL', 400, 'SUBMISSION_VIDEO_URL_REQUIRED');
        }
        const status = resubmission ? 'resubmitted' : 'submitted';
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction
                .request()
                .input('id', mssql_1.default.UniqueIdentifier, id)
                .input('status', mssql_1.default.NVarChar(40), status)
                .query(`
          UPDATE dbo.submissions
          SET status = @status, submitted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @id
        `);
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, id)
                .input('fromStatus', mssql_1.default.NVarChar(40), submission.status)
                .input('toStatus', mssql_1.default.NVarChar(40), status)
                .input('changedBy', mssql_1.default.UniqueIdentifier, changedBy)
                .query(`
          INSERT INTO dbo.submission_status_history (submission_id, from_status, to_status, changed_by, reason)
          VALUES (@submissionId, @fromStatus, @toStatus, @changedBy, 'submitted')
        `);
            await transaction.commit();
            return mapSubmission(result.recordset[0]);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async setStatus(id, status, changedBy, reason) {
        const current = await this.findById(id);
        if (!current)
            return null;
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction
                .request()
                .input('id', mssql_1.default.UniqueIdentifier, id)
                .input('status', mssql_1.default.NVarChar(40), status)
                .query('UPDATE dbo.submissions SET status = @status, updated_at = SYSUTCDATETIME() OUTPUT INSERTED.* WHERE id = @id');
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, id)
                .input('fromStatus', mssql_1.default.NVarChar(40), current.status)
                .input('toStatus', mssql_1.default.NVarChar(40), status)
                .input('changedBy', mssql_1.default.UniqueIdentifier, changedBy)
                .input('reason', mssql_1.default.NVarChar(255), reason)
                .query('INSERT INTO dbo.submission_status_history (submission_id, from_status, to_status, changed_by, reason) VALUES (@submissionId, @fromStatus, @toStatus, @changedBy, @reason)');
            await transaction.commit();
            return mapSubmission(result.recordset[0]);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async deleteDraft(id, ownerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, ownerUserId)
            .query(`
        UPDATE dbo.submissions
        SET deleted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id
        WHERE id = @id AND owner_user_id = @ownerUserId
          AND status = 'draft' AND deleted_at IS NULL
      `);
        return Boolean(result.recordset[0]);
    }
    async validateKnowledgeSelection(transaction, eventId, areaId, lineId) {
        if (areaId) {
            const area = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('areaId', mssql_1.default.UniqueIdentifier, areaId)
                .query(`
          SELECT COUNT(1) AS total
          FROM dbo.event_knowledge_areas
          WHERE id = @areaId AND event_id = @eventId AND is_active = 1 AND deleted_at IS NULL
        `);
            if ((area.recordset[0]?.total ?? 0) === 0) {
                throw new app_error_1.AppError('Knowledge area not found', 404, 'KNOWLEDGE_AREA_NOT_FOUND');
            }
        }
        if (lineId) {
            const line = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                .input('areaId', mssql_1.default.UniqueIdentifier, areaId)
                .input('lineId', mssql_1.default.UniqueIdentifier, lineId)
                .query(`
          SELECT COUNT(1) AS total
          FROM dbo.event_knowledge_lines
          WHERE id = @lineId
            AND event_id = @eventId
            AND is_active = 1
            AND deleted_at IS NULL
            AND (@areaId IS NULL OR area_id = @areaId)
        `);
            if ((line.recordset[0]?.total ?? 0) === 0) {
                throw new app_error_1.AppError('Knowledge line not found', 404, 'KNOWLEDGE_LINE_NOT_FOUND');
            }
        }
    }
}
exports.SubmissionsRepository = SubmissionsRepository;
//# sourceMappingURL=submissions.repository.js.map