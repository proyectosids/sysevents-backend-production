"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
class EvaluationsRepository {
    async listInvitations(eventId, userId, unrestricted = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('unrestricted', mssql_1.default.Bit, unrestricted)
            .query(`
        SELECT invitation.id, invitation.email, invitation.program_id AS programId,
          program.name AS programName, invitation.expires_at AS expiresAt,
          invitation.accepted_at AS acceptedAt, invitation.revoked_at AS revokedAt,
          invitation.created_at AS createdAt
        FROM dbo.event_evaluator_invitations invitation
        LEFT JOIN dbo.event_programs program ON program.id = invitation.program_id
        WHERE invitation.event_id = @eventId
          AND (
            @unrestricted = 1
            OR EXISTS (
              SELECT 1 FROM dbo.event_program_staff_assignments supervisor
              WHERE supervisor.event_id = invitation.event_id AND supervisor.user_id = @userId
                AND supervisor.staff_role = 'supervisor' AND supervisor.is_active = 1
                AND (supervisor.program_id IS NULL OR supervisor.program_id = invitation.program_id)
            )
          )
        ORDER BY invitation.created_at DESC
      `);
        return result.recordset;
    }
    async findInvitation(invitationId, eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, invitationId)
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query('SELECT TOP 1 id, program_id FROM dbo.event_evaluator_invitations WHERE id = @id AND event_id = @eventId');
        return result.recordset[0] ?? null;
    }
    async revokeInvitation(invitationId, eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('id', mssql_1.default.UniqueIdentifier, invitationId)
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        UPDATE dbo.event_evaluator_invitations
        SET revoked_at = SYSUTCDATETIME()
        WHERE id = @id AND event_id = @eventId AND accepted_at IS NULL AND revoked_at IS NULL
      `);
        return (result.rowsAffected[0] ?? 0) > 0;
    }
    async createInvitation(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
            .input('email', mssql_1.default.NVarChar(255), input.email.toLowerCase())
            .input('tokenHash', mssql_1.default.NVarChar(128), input.tokenHash)
            .input('expiresAt', mssql_1.default.DateTime2, input.expiresAt)
            .input('invitedBy', mssql_1.default.UniqueIdentifier, input.invitedBy)
            .query(`
        UPDATE dbo.event_evaluator_invitations
        SET revoked_at = SYSUTCDATETIME()
        WHERE event_id = @eventId AND email = @email AND accepted_at IS NULL AND revoked_at IS NULL;

        INSERT INTO dbo.event_evaluator_invitations (
          event_id, program_id, email, user_id, token_hash, expires_at, invited_by
        )
        OUTPUT INSERTED.id, (SELECT name FROM dbo.events WHERE id = @eventId) AS event_name
        SELECT @eventId, @programId, @email, user.id, @tokenHash, @expiresAt, @invitedBy
        FROM (SELECT 1 AS marker) source
        LEFT JOIN dbo.users user ON user.email = @email;
      `);
        return result.recordset[0];
    }
    async acceptInvitation(tokenHash, userId, userEmail) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const invitation = await transaction.request()
                .input('tokenHash', mssql_1.default.NVarChar(128), tokenHash)
                .input('userEmail', mssql_1.default.NVarChar(255), userEmail.toLowerCase())
                .query(`
          SELECT TOP 1 id, event_id, program_id
          FROM dbo.event_evaluator_invitations WITH (UPDLOCK, ROWLOCK)
          WHERE token_hash = @tokenHash AND email = @userEmail
            AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > SYSUTCDATETIME()
        `);
            const row = invitation.recordset[0];
            if (!row)
                throw new app_error_1.AppError('La invitación no existe, venció, fue revocada o pertenece a otro correo.', 409, 'EVALUATOR_INVITATION_INVALID');
            await transaction.request()
                .input('id', mssql_1.default.UniqueIdentifier, row.id)
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query('UPDATE dbo.event_evaluator_invitations SET user_id = @userId, accepted_at = SYSUTCDATETIME() WHERE id = @id');
            await transaction.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, row.event_id)
                .input('programId', mssql_1.default.UniqueIdentifier, row.program_id)
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          IF EXISTS (
            SELECT 1 FROM dbo.event_program_staff_assignments
            WHERE event_id = @eventId AND ((program_id = @programId) OR (program_id IS NULL AND @programId IS NULL))
              AND user_id = @userId AND staff_role = 'evaluator'
          )
            UPDATE dbo.event_program_staff_assignments SET is_active = 1, updated_at = SYSUTCDATETIME()
            WHERE event_id = @eventId AND ((program_id = @programId) OR (program_id IS NULL AND @programId IS NULL))
              AND user_id = @userId AND staff_role = 'evaluator';
          ELSE
            INSERT INTO dbo.event_program_staff_assignments (event_id, program_id, user_id, staff_role)
            VALUES (@eventId, @programId, @userId, 'evaluator');

          INSERT INTO dbo.user_roles (user_id, role_id)
          SELECT @userId, role.id FROM dbo.roles role
          WHERE role.name = 'event_evaluator'
            AND NOT EXISTS (SELECT 1 FROM dbo.user_roles existing WHERE existing.user_id = @userId AND existing.role_id = role.id);
        `);
            await transaction.commit();
            return { eventId: row.event_id, programId: row.program_id };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async assign(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
            .input('evaluatorUserId', mssql_1.default.UniqueIdentifier, input.evaluatorUserId)
            .input('evaluationFormId', mssql_1.default.UniqueIdentifier, input.evaluationFormId ?? null)
            .input('dueAt', mssql_1.default.DateTime2, input.dueAt ?? null)
            .input('assignedBy', mssql_1.default.UniqueIdentifier, input.assignedBy)
            .query(`
        INSERT INTO dbo.event_evaluator_assignments (
          event_id, program_id, submission_id, evaluator_user_id, evaluation_form_id, due_at, assigned_by
        )
        OUTPUT INSERTED.*
        SELECT submission.event_id, submission.program_id, submission.id, @evaluatorUserId, @evaluationFormId, @dueAt, @assignedBy
        FROM dbo.submissions submission
        WHERE submission.id = @submissionId
          AND EXISTS (
            SELECT 1 FROM dbo.event_program_staff_assignments staff
            WHERE staff.event_id = submission.event_id AND staff.user_id = @evaluatorUserId
              AND staff.staff_role = 'evaluator' AND staff.is_active = 1
              AND (staff.program_id IS NULL OR staff.program_id = submission.program_id)
          )
      `);
        if (!result.recordset[0])
            throw new app_error_1.AppError('El evaluador no aceptó una invitación compatible con este trabajo.', 409, 'EVALUATOR_SCOPE_MISMATCH');
        return result.recordset[0];
    }
    async listMine(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT assignment.id, assignment.status, assignment.due_at AS dueAt,
          event.id AS eventId, event.name AS eventName,
          program.id AS programId, program.name AS programName,
          submission.id AS submissionId, submission.title AS submissionTitle,
          submission_type.name AS submissionType,
          form.id AS formId, form.name AS formName, form.status AS formStatus,
          form.definition_json AS definitionJson,
          form.printable_template_file_id AS printableTemplateFileId,
          evaluation.submitted_at AS submittedAt
        FROM dbo.event_evaluator_assignments assignment
        INNER JOIN dbo.events event ON event.id = assignment.event_id
        LEFT JOIN dbo.event_programs program ON program.id = assignment.program_id
        INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
        INNER JOIN dbo.submission_types submission_type ON submission_type.id = submission.submission_type_id
        LEFT JOIN dbo.event_evaluation_forms form ON form.id = assignment.evaluation_form_id
        LEFT JOIN dbo.event_evaluations evaluation ON evaluation.assignment_id = assignment.id
        WHERE assignment.evaluator_user_id = @userId AND assignment.status <> 'cancelled'
        ORDER BY CASE assignment.status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
          assignment.created_at DESC
      `);
        return result.recordset;
    }
    async printableFormFile(assignmentId, evaluatorUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .input('userId', mssql_1.default.UniqueIdentifier, evaluatorUserId)
            .query(`
        SELECT TOP 1 form.printable_template_file_id AS file_id
        FROM dbo.event_evaluator_assignments assignment
        INNER JOIN dbo.event_evaluation_forms form ON form.id = assignment.evaluation_form_id AND form.status = 'active'
        WHERE assignment.id = @assignmentId AND assignment.evaluator_user_id = @userId
          AND form.printable_template_file_id IS NOT NULL
      `);
        return result.recordset[0]?.file_id ?? null;
    }
    async submit(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const assignment = await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('userId', mssql_1.default.UniqueIdentifier, input.evaluatorUserId)
                .query(`
          SELECT assignment.id, form.status AS form_status, form.definition_json
          FROM dbo.event_evaluator_assignments assignment
          LEFT JOIN dbo.event_evaluation_forms form ON form.id = assignment.evaluation_form_id
          WHERE assignment.id = @assignmentId AND assignment.evaluator_user_id = @userId
            AND assignment.status IN ('pending', 'in_progress')
        `);
            const row = assignment.recordset[0];
            if (!row)
                throw new app_error_1.AppError('Evaluación no encontrada o ya enviada.', 404, 'EVALUATION_ASSIGNMENT_NOT_FOUND');
            if (row.form_status !== 'active' || !row.definition_json) {
                throw new app_error_1.AppError('El formato definitivo de evaluación todavía no está configurado.', 409, 'EVALUATION_FORMAT_PENDING');
            }
            const result = await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('answersJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(input.answers))
                .input('comments', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comments ?? null)
                .query(`
          INSERT INTO dbo.event_evaluations (assignment_id, answers_json, comments)
          OUTPUT INSERTED.*
          VALUES (@assignmentId, @answersJson, @comments);
          UPDATE dbo.event_evaluator_assignments
          SET status = 'submitted', updated_at = SYSUTCDATETIME()
          WHERE id = @assignmentId;
        `);
            await transaction.commit();
            return result.recordset[0];
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async participantFeedback(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT evaluation.id, evaluation.submitted_at AS submittedAt,
          submission.id AS submissionId, submission.title AS submissionTitle,
          submission_type.name AS submissionType,
          evaluator.first_name AS evaluatorFirstName, evaluator.last_name AS evaluatorLastName,
          evaluation.answers_json AS answersJson, evaluation.comments
        FROM dbo.event_evaluations evaluation
        INNER JOIN dbo.event_evaluator_assignments assignment ON assignment.id = evaluation.assignment_id
        INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
        INNER JOIN dbo.submission_types submission_type ON submission_type.id = submission.submission_type_id
        INNER JOIN dbo.users evaluator ON evaluator.id = assignment.evaluator_user_id
        WHERE submission.owner_user_id = @userId AND assignment.status = 'submitted'
        ORDER BY evaluation.submitted_at DESC
      `);
        return result.recordset;
    }
}
exports.EvaluationsRepository = EvaluationsRepository;
//# sourceMappingURL=evaluations.repository.js.map