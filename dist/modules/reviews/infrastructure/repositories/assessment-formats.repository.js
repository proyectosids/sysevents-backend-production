"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssessmentFormatsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
const assessment_engine_1 = require("../../domain/assessment-engine");
const parse = (value, fallback) => {
    try {
        return value ? JSON.parse(value) : fallback;
    }
    catch {
        return fallback;
    }
};
class AssessmentFormatsRepository {
    async list(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).query(`
      SELECT format.id, format.event_id AS eventId, format.name, format.purpose, format.instructions,
        format.status, format.created_at AS createdAt, format.updated_at AS updatedAt,
        version.id AS versionId, version.version_number AS versionNumber, version.status AS versionStatus,
        version.definition_json AS definitionJson, version.printable_template_file_id AS printableTemplateFileId,
        version.published_at AS publishedAt,
        COALESCE((SELECT scope.program_id AS programId, program.name AS programName,
          scope.submission_type_id AS submissionTypeId, submission_type.name AS submissionTypeName
          FROM dbo.event_assessment_format_scopes scope
          LEFT JOIN dbo.event_programs program ON program.id = scope.program_id
          LEFT JOIN dbo.submission_types submission_type ON submission_type.id = scope.submission_type_id
          WHERE scope.format_id = format.id FOR JSON PATH), '[]') AS scopesJson
      FROM dbo.event_assessment_formats format
      OUTER APPLY (
        SELECT TOP 1 version.* FROM dbo.event_assessment_format_versions version
        WHERE version.format_id = format.id
        ORDER BY CASE version.status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END, version.version_number DESC
      ) version
      WHERE format.event_id = @eventId
      ORDER BY CASE format.status WHEN 'draft' THEN 0 WHEN 'published' THEN 1 ELSE 2 END, format.updated_at DESC
    `);
        return result.recordset.map((row) => ({ ...row, definition: parse(row.definitionJson, null), scopes: parse(row.scopesJson, []) }));
    }
    async versions(eventId, formatId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).input('formatId', mssql_1.default.UniqueIdentifier, formatId).query(`
      SELECT version.id, version.version_number AS versionNumber, version.status,
        version.definition_json AS definitionJson, version.printable_template_file_id AS printableTemplateFileId,
        version.published_at AS publishedAt, version.created_at AS createdAt, version.updated_at AS updatedAt
      FROM dbo.event_assessment_format_versions version
      INNER JOIN dbo.event_assessment_formats format ON format.id = version.format_id AND format.event_id = @eventId
      WHERE version.format_id = @formatId ORDER BY version.version_number DESC
    `);
        return result.recordset.map((row) => ({ ...row, definition: parse(row.definitionJson, null) }));
    }
    async create(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const created = await transaction.request().input('eventId', mssql_1.default.UniqueIdentifier, input.eventId).input('name', mssql_1.default.NVarChar(180), input.name)
                .input('purpose', mssql_1.default.NVarChar(30), input.purpose).input('instructions', mssql_1.default.NVarChar(mssql_1.default.MAX), input.instructions ?? null).input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                .input('definition', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.definition)).input('fileId', mssql_1.default.UniqueIdentifier, input.printableTemplateFileId ?? null).query(`
          DECLARE @created TABLE (id UNIQUEIDENTIFIER);
          INSERT INTO dbo.event_assessment_formats (event_id, name, purpose, instructions, created_by)
          OUTPUT INSERTED.id INTO @created VALUES (@eventId, @name, @purpose, @instructions, @userId);
          DECLARE @formatId UNIQUEIDENTIFIER = (SELECT TOP 1 id FROM @created);
          INSERT INTO dbo.event_assessment_format_versions (format_id, version_number, definition_json, printable_template_file_id, created_by)
          OUTPUT @formatId AS id, INSERTED.id AS versionId VALUES (@formatId, 1, @definition, @fileId, @userId);
        `);
            await this.replaceScopes(transaction, created.recordset[0].id, input.scopes);
            await transaction.commit();
            return created.recordset[0];
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async replaceScopes(transaction, formatId, scopes) {
        await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, formatId).query('DELETE FROM dbo.event_assessment_format_scopes WHERE format_id = @formatId');
        const normalized = scopes.length ? scopes : [{ programId: null, submissionTypeId: null }];
        for (const scope of normalized)
            await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, formatId)
                .input('programId', mssql_1.default.UniqueIdentifier, scope.programId ?? null).input('submissionTypeId', mssql_1.default.UniqueIdentifier, scope.submissionTypeId ?? null)
                .query('INSERT INTO dbo.event_assessment_format_scopes (format_id, program_id, submission_type_id) VALUES (@formatId, @programId, @submissionTypeId)');
    }
    async updateDraft(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const format = await transaction.request().input('eventId', mssql_1.default.UniqueIdentifier, input.eventId).input('formatId', mssql_1.default.UniqueIdentifier, input.formatId).query('SELECT TOP 1 id FROM dbo.event_assessment_formats WHERE id=@formatId AND event_id=@eventId AND status <> \'archived\'');
            if (!format.recordset[0])
                throw new app_error_1.AppError('Formato no encontrado o archivado.', 404, 'ASSESSMENT_FORMAT_NOT_FOUND');
            let draft = await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, input.formatId).query("SELECT TOP 1 id FROM dbo.event_assessment_format_versions WHERE format_id=@formatId AND status='draft' ORDER BY version_number DESC");
            if (!draft.recordset[0]) {
                draft = await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, input.formatId).input('userId', mssql_1.default.UniqueIdentifier, input.userId).query(`
          INSERT INTO dbo.event_assessment_format_versions (format_id, version_number, definition_json, printable_template_file_id, created_by)
          OUTPUT INSERTED.id
          SELECT TOP 1 @formatId,
            (SELECT MAX(numbered.version_number) + 1 FROM dbo.event_assessment_format_versions numbered WHERE numbered.format_id=@formatId),
            latest.definition_json, latest.printable_template_file_id, @userId
          FROM dbo.event_assessment_format_versions latest
          WHERE latest.format_id=@formatId
          ORDER BY latest.version_number DESC;
        `);
            }
            await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, input.formatId).input('name', mssql_1.default.NVarChar(180), input.name ?? null)
                .input('instructions', mssql_1.default.NVarChar(mssql_1.default.MAX), input.instructions ?? null).input('updateInstructions', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'instructions'))
                .query('UPDATE dbo.event_assessment_formats SET name=COALESCE(@name,name), instructions=CASE WHEN @updateInstructions=1 THEN @instructions ELSE instructions END, updated_at=SYSUTCDATETIME() WHERE id=@formatId');
            await transaction.request().input('versionId', mssql_1.default.UniqueIdentifier, draft.recordset[0].id)
                .input('definition', mssql_1.default.NVarChar(mssql_1.default.MAX), input.definition ? JSON.stringify(input.definition) : null).input('fileId', mssql_1.default.UniqueIdentifier, input.printableTemplateFileId ?? null)
                .input('updateFile', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'printableTemplateFileId'))
                .query('UPDATE dbo.event_assessment_format_versions SET definition_json=COALESCE(@definition,definition_json), printable_template_file_id=CASE WHEN @updateFile=1 THEN @fileId ELSE printable_template_file_id END, updated_at=SYSUTCDATETIME() WHERE id=@versionId AND status=\'draft\'');
            if (input.scopes)
                await this.replaceScopes(transaction, input.formatId, input.scopes);
            await transaction.commit();
            return { formatId: input.formatId, versionId: draft.recordset[0].id };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async publish(eventId, formatId, versionId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const row = await transaction.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).input('formatId', mssql_1.default.UniqueIdentifier, formatId).input('versionId', mssql_1.default.UniqueIdentifier, versionId).query(`
        SELECT TOP 1 version.definition_json FROM dbo.event_assessment_format_versions version
        INNER JOIN dbo.event_assessment_formats format ON format.id=version.format_id
        WHERE format.event_id=@eventId AND format.id=@formatId AND version.id=@versionId AND version.status='draft'
      `);
            if (!row.recordset[0])
                throw new app_error_1.AppError('Sólo una versión borrador puede publicarse.', 409, 'ASSESSMENT_DRAFT_REQUIRED');
            const definition = parse(row.recordset[0].definition_json, {});
            const errors = (0, assessment_engine_1.validateAssessmentDefinition)(definition);
            if (errors.length)
                throw new app_error_1.AppError('El formato contiene errores y no puede publicarse.', 422, 'ASSESSMENT_FORMAT_INVALID', { errors });
            await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, formatId).input('versionId', mssql_1.default.UniqueIdentifier, versionId).input('userId', mssql_1.default.UniqueIdentifier, userId).query(`
        UPDATE dbo.event_assessment_format_versions SET status='archived', updated_at=SYSUTCDATETIME() WHERE format_id=@formatId AND status='published';
        UPDATE dbo.event_assessment_format_versions SET status='published', published_by=@userId, published_at=SYSUTCDATETIME(), updated_at=SYSUTCDATETIME() WHERE id=@versionId;
        UPDATE dbo.event_assessment_formats SET status='published', updated_at=SYSUTCDATETIME() WHERE id=@formatId;
      `);
            await transaction.commit();
            return { formatId, versionId };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async archive(eventId, formatId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).input('formatId', mssql_1.default.UniqueIdentifier, formatId).query(`UPDATE dbo.event_assessment_formats SET status='archived',updated_at=SYSUTCDATETIME() WHERE id=@formatId AND event_id=@eventId; SELECT @@ROWCOUNT AS affected;`);
        return Number(result.recordset[0]?.affected ?? 0) > 0;
    }
    async remove(eventId, formatId) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const format = await transaction.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).input('formatId', mssql_1.default.UniqueIdentifier, formatId).query('SELECT id FROM dbo.event_assessment_formats WHERE id=@formatId AND event_id=@eventId');
            if (!format.recordset[0])
                throw new app_error_1.AppError('Formato no encontrado.', 404, 'ASSESSMENT_FORMAT_NOT_FOUND');
            const usage = await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, formatId).query(`
        SELECT
          (SELECT COUNT(1) FROM dbo.review_assignments assignment INNER JOIN dbo.event_assessment_format_versions version ON version.id=assignment.assessment_format_version_id WHERE version.format_id=@formatId)
          + (SELECT COUNT(1) FROM dbo.event_evaluator_assignments assignment INNER JOIN dbo.event_assessment_format_versions version ON version.id=assignment.assessment_format_version_id WHERE version.format_id=@formatId) AS assignments,
          (SELECT COUNT(1) FROM dbo.assessment_responses response INNER JOIN dbo.event_assessment_format_versions version ON version.id=response.format_version_id WHERE version.format_id=@formatId) AS responses;
      `);
            if ((usage.recordset[0]?.assignments ?? 0) > 0 || (usage.recordset[0]?.responses ?? 0) > 0) {
                throw new app_error_1.AppError('Este formato ya tiene asignaciones o respuestas. Archívalo para impedir nuevos usos sin perder el historial.', 409, 'ASSESSMENT_FORMAT_IN_USE');
            }
            await transaction.request().input('formatId', mssql_1.default.UniqueIdentifier, formatId).query(`
        DELETE FROM dbo.event_assessment_format_scopes WHERE format_id=@formatId;
        DELETE FROM dbo.event_assessment_format_versions WHERE format_id=@formatId;
        DELETE FROM dbo.event_assessment_formats WHERE id=@formatId;
      `);
            await transaction.commit();
            return true;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async duplicate(eventId, formatId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const source = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).input('formatId', mssql_1.default.UniqueIdentifier, formatId).query(`
      SELECT TOP 1 format.name,format.purpose,format.instructions,version.definition_json AS definitionJson,version.printable_template_file_id AS printableTemplateFileId,
        COALESCE((SELECT program_id AS programId,submission_type_id AS submissionTypeId FROM dbo.event_assessment_format_scopes WHERE format_id=format.id FOR JSON PATH),'[]') AS scopesJson
      FROM dbo.event_assessment_formats format INNER JOIN dbo.event_assessment_format_versions version ON version.format_id=format.id
      WHERE format.id=@formatId AND format.event_id=@eventId ORDER BY version.version_number DESC
    `);
        const row = source.recordset[0];
        if (!row)
            throw new app_error_1.AppError('Formato no encontrado.', 404, 'ASSESSMENT_FORMAT_NOT_FOUND');
        return this.create({ eventId, name: `${row.name} (copia)`, purpose: row.purpose, instructions: row.instructions, scopes: parse(row.scopesJson, []), definition: parse(row.definitionJson, {}), printableTemplateFileId: row.printableTemplateFileId, userId });
    }
    async eligibleVersions(eventId, purpose, programId, submissionTypeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId).input('purpose', mssql_1.default.NVarChar(30), purpose).input('programId', mssql_1.default.UniqueIdentifier, programId ?? null).input('submissionTypeId', mssql_1.default.UniqueIdentifier, submissionTypeId ?? null).query(`
      SELECT DISTINCT format.id AS formatId,format.name,version.id AS versionId,version.version_number AS versionNumber
      FROM dbo.event_assessment_formats format INNER JOIN dbo.event_assessment_format_versions version ON version.format_id=format.id AND version.status='published'
      INNER JOIN dbo.event_assessment_format_scopes scope ON scope.format_id=format.id
      WHERE format.event_id=@eventId AND format.purpose=@purpose AND format.status='published'
        AND (scope.program_id IS NULL OR scope.program_id=@programId)
        AND (scope.submission_type_id IS NULL OR scope.submission_type_id=@submissionTypeId)
      ORDER BY format.name
    `);
        return result.recordset;
    }
    async workspace(kind, assignmentId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const table = kind === 'review' ? 'review_assignments' : 'event_evaluator_assignments';
        const userColumn = kind === 'review' ? 'reviewer_user_id' : 'evaluator_user_id';
        const responseColumn = kind === 'review' ? 'review_assignment_id' : 'evaluator_assignment_id';
        const result = await pool.request().input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId).input('userId', mssql_1.default.UniqueIdentifier, userId).query(`
      SELECT assignment.id,assignment.status,version.id AS versionId,version.version_number AS versionNumber,version.definition_json AS definitionJson,
        format.id AS formatId,format.name AS formatName,format.instructions,format.purpose,version.printable_template_file_id AS printableTemplateFileId,
        response.id AS responseId,response.answers_json AS answersJson,response.calculated_json AS calculatedJson,response.recommendation,response.proposed_decision AS proposedDecision,response.comments,response.status AS responseStatus,
        event.name AS eventName,event.logo_file_id AS eventLogoFileId,submission.title AS submissionTitle,submission_type.name AS submissionType,
        knowledge_area.name AS knowledgeArea,knowledge_line.name AS knowledgeLine,registration_response.answers_json AS registrationAnswersJson
      FROM dbo.${table} assignment
      INNER JOIN dbo.submissions submission ON submission.id=assignment.submission_id
      INNER JOIN dbo.events event ON event.id=submission.event_id
      LEFT JOIN dbo.submission_types submission_type ON submission_type.id=submission.submission_type_id
      LEFT JOIN dbo.event_knowledge_areas knowledge_area ON knowledge_area.id=submission.knowledge_area_id
      LEFT JOIN dbo.event_knowledge_lines knowledge_line ON knowledge_line.id=submission.knowledge_line_id
      OUTER APPLY (
        SELECT TOP 1 form_response.answers_json
        FROM dbo.event_registration_form_responses form_response
        WHERE form_response.registration_id=submission.registration_id
        ORDER BY form_response.submitted_at DESC
      ) registration_response
      LEFT JOIN dbo.event_assessment_format_versions version ON version.id=assignment.assessment_format_version_id
      LEFT JOIN dbo.event_assessment_formats format ON format.id=version.format_id
      LEFT JOIN dbo.assessment_responses response ON response.${responseColumn}=assignment.id
      WHERE assignment.id=@assignmentId AND assignment.${userColumn}=@userId
    `);
        const row = result.recordset[0];
        if (!row)
            return null;
        return {
            ...row,
            definition: parse(row.definitionJson, null),
            answers: parse(row.answersJson, {}),
            calculated: parse(row.calculatedJson, {}),
            context: {
                eventName: row.eventName ?? null, eventLogoFileId: row.eventLogoFileId ?? null,
                submissionTitle: row.submissionTitle ?? null, submissionType: row.submissionType ?? null,
                knowledgeArea: row.knowledgeArea ?? null, knowledgeLine: row.knowledgeLine ?? null,
                registrationAnswers: parse(row.registrationAnswersJson, {}),
            },
        };
    }
    async saveResponse(input) {
        const workspace = await this.workspace(input.kind, input.assignmentId, input.userId);
        if (!workspace)
            throw new app_error_1.AppError('Asignación no encontrada.', 404, 'ASSESSMENT_ASSIGNMENT_NOT_FOUND');
        if (!workspace.versionId || !workspace.definition)
            throw new app_error_1.AppError('La asignación todavía no tiene un formato publicado.', 409, 'ASSESSMENT_FORMAT_PENDING');
        const evaluation = (0, assessment_engine_1.evaluateAssessment)(workspace.definition, input.answers, input.comments);
        if (input.submit && evaluation.errors.length)
            throw new app_error_1.AppError('Corrige las respuestas antes de enviar.', 422, 'ASSESSMENT_RESPONSE_INVALID', { errors: evaluation.errors });
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const reviewId = input.kind === 'review' ? input.assignmentId : null;
            const evaluationId = input.kind === 'evaluation' ? input.assignmentId : null;
            const saved = await transaction.request().input('versionId', mssql_1.default.UniqueIdentifier, workspace.versionId).input('reviewId', mssql_1.default.UniqueIdentifier, reviewId).input('evaluationId', mssql_1.default.UniqueIdentifier, evaluationId).input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                .input('answers', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.answers)).input('calculated', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(evaluation.calculated)).input('recommendation', mssql_1.default.NVarChar(40), evaluation.recommendation)
                .input('proposedDecision', mssql_1.default.NVarChar(40), input.proposedDecision ?? null).input('comments', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comments ?? null).input('status', mssql_1.default.NVarChar(20), input.submit ? 'submitted' : 'draft').query(`
          MERGE dbo.assessment_responses AS target USING (SELECT @reviewId AS review_id,@evaluationId AS evaluation_id) AS source
          ON (target.review_assignment_id=source.review_id OR target.evaluator_assignment_id=source.evaluation_id)
          WHEN MATCHED THEN UPDATE SET answers_json=@answers,calculated_json=@calculated,recommendation=@recommendation,proposed_decision=@proposedDecision,comments=@comments,status=@status,submitted_at=CASE WHEN @status='submitted' THEN SYSUTCDATETIME() ELSE submitted_at END,updated_at=SYSUTCDATETIME()
          WHEN NOT MATCHED THEN INSERT(format_version_id,review_assignment_id,evaluator_assignment_id,respondent_user_id,answers_json,calculated_json,recommendation,proposed_decision,comments,status,submitted_at)
          VALUES(@versionId,@reviewId,@evaluationId,@userId,@answers,@calculated,@recommendation,@proposedDecision,@comments,@status,CASE WHEN @status='submitted' THEN SYSUTCDATETIME() ELSE NULL END)
          OUTPUT INSERTED.id;
        `);
            const responseId = saved.recordset[0].id;
            await transaction.request().input('responseId', mssql_1.default.UniqueIdentifier, responseId).input('action', mssql_1.default.NVarChar(30), input.submit ? 'submitted' : 'draft_saved').input('snapshot', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify({ answers: input.answers, calculated: evaluation.calculated, recommendation: evaluation.recommendation, comments: input.comments })).input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                .query('INSERT INTO dbo.assessment_response_history(response_id,action,snapshot_json,acted_by) VALUES(@responseId,@action,@snapshot,@userId)');
            if (input.kind === 'evaluation' && input.submit)
                await transaction.request().input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId).input('answers', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.answers)).input('comments', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comments ?? null).query(`
        IF EXISTS(SELECT 1 FROM dbo.event_evaluations WHERE assignment_id=@assignmentId) UPDATE dbo.event_evaluations SET answers_json=@answers,comments=@comments,updated_at=SYSUTCDATETIME() WHERE assignment_id=@assignmentId;
        ELSE INSERT INTO dbo.event_evaluations(assignment_id,answers_json,comments) VALUES(@assignmentId,@answers,@comments);
        UPDATE dbo.event_evaluator_assignments SET status='submitted',updated_at=SYSUTCDATETIME() WHERE id=@assignmentId;
      `);
            if (input.kind === 'review' && input.submit) {
                const firstScore = Object.values(evaluation.calculated)[0];
                const transition = await transaction.request().input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                    .input('recommendation', mssql_1.default.NVarChar(40), evaluation.recommendation ?? input.proposedDecision ?? 'changes_requested')
                    .input('comments', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comments ?? null)
                    .input('score', mssql_1.default.Decimal(8, 2), typeof firstScore === 'number' ? firstScore : null)
                    .input('userId', mssql_1.default.UniqueIdentifier, input.userId).query(`
            DECLARE @previous NVARCHAR(40)=(SELECT status FROM dbo.review_assignments WHERE id=@assignmentId AND reviewer_user_id=@userId);
            IF @previous NOT IN ('assigned','returned_to_reviewer') THROW 51000, 'REVIEW_NOT_SUBMITTABLE', 1;
            INSERT INTO dbo.review_results(assignment_id,recommendation,comments,score) VALUES(@assignmentId,@recommendation,@comments,@score);
            UPDATE dbo.review_assignments SET status='submitted_to_leader',submitted_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME() OUTPUT INSERTED.id WHERE id=@assignmentId;
            INSERT INTO dbo.review_workflow_history(assignment_id,action,from_status,to_status,acted_by) VALUES(@assignmentId,'submitted_to_leader',@previous,'submitted_to_leader',@userId);
          `);
                if (!transition.recordset[0])
                    throw new app_error_1.AppError('La revisión ya fue enviada o no está disponible.', 409, 'REVIEW_NOT_SUBMITTABLE');
            }
            await transaction.commit();
            return { responseId, ...evaluation, status: input.submit ? 'submitted' : 'draft' };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
exports.AssessmentFormatsRepository = AssessmentFormatsRepository;
//# sourceMappingURL=assessment-formats.repository.js.map