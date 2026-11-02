"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
const parseJson = (value, fallback) => {
    try {
        return value ? JSON.parse(value) : fallback;
    }
    catch {
        return fallback;
    }
};
class ReviewsRepository {
    async listProgramReviewTeams(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT program.id AS program_id, program.name AS program_name,
          member.user_id, users.first_name, users.last_name, users.email, member.team_role
        FROM dbo.event_programs program
        LEFT JOIN dbo.event_program_review_team_members member ON member.program_id = program.id
        LEFT JOIN dbo.users users ON users.id = member.user_id
        WHERE program.event_id = @eventId AND program.deleted_at IS NULL
        ORDER BY program.sort_order, program.name,
          CASE WHEN member.team_role = 'leader' THEN 0 ELSE 1 END,
          users.first_name, users.last_name
      `);
        const teams = new Map();
        for (const row of result.recordset) {
            const team = teams.get(row.program_id) ?? {
                programId: row.program_id,
                programName: row.program_name,
                leader: null,
                reviewers: [],
            };
            if (row.user_id) {
                const user = {
                    userId: row.user_id,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    email: row.email,
                };
                if (row.team_role === 'leader')
                    team.leader = user;
                else
                    team.reviewers.push(user);
            }
            teams.set(row.program_id, team);
        }
        return Array.from(teams.values());
    }
    async saveProgramReviewTeam(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const validProgram = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                .query(`
          SELECT COUNT(1) AS total
          FROM dbo.event_programs
          WHERE id = @programId AND event_id = @eventId AND deleted_at IS NULL
        `);
            if ((validProgram.recordset[0]?.total ?? 0) === 0) {
                await transaction.rollback();
                return false;
            }
            const users = Array.from(new Set([input.leaderUserId, ...input.reviewerUserIds]));
            const memberships = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('usersJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(users))
                .query(`
          SELECT COUNT(DISTINCT tenant_user.user_id) AS total
            , COUNT(DISTINCT CASE WHEN tenant_user.tenant_role = 'reviewer' THEN tenant_user.user_id END) AS reviewer_total
          FROM dbo.events event
          INNER JOIN dbo.tenant_users tenant_user ON tenant_user.tenant_id = event.tenant_id
          INNER JOIN OPENJSON(@usersJson) WITH (user_id UNIQUEIDENTIFIER '$') selected
            ON selected.user_id = tenant_user.user_id
          WHERE event.id = @eventId
        `);
            const membershipTotals = memberships.recordset[0];
            if ((membershipTotals?.total ?? 0) !== users.length) {
                throw new app_error_1.AppError('Review team users must belong to the event organization', 400, 'REVIEW_TEAM_USERS_NOT_IN_TENANT');
            }
            if ((membershipTotals?.reviewer_total ?? 0) !== users.length) {
                throw new app_error_1.AppError('Solo usuarios con rol Revisor pueden ser lideres o formar parte del equipo de revisores.', 400, 'REVIEW_TEAM_USERS_MUST_BE_REVIEWERS');
            }
            const assignedElsewhere = await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                .input('usersJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(users))
                .query(`
          SELECT COUNT(1) AS total
          FROM dbo.event_program_review_team_members member
          INNER JOIN OPENJSON(@usersJson) WITH (user_id UNIQUEIDENTIFIER '$') selected
            ON selected.user_id = member.user_id
          WHERE member.event_id = @eventId
            AND member.program_id <> @programId
        `);
            if ((assignedElsewhere.recordset[0]?.total ?? 0) > 0) {
                throw new app_error_1.AppError('Un usuario solo puede pertenecer a un equipo de revision por evento, ya sea como lider o como revisor.', 400, 'REVIEW_TEAM_USER_ALREADY_ASSIGNED');
            }
            await transaction
                .request()
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                .query('DELETE FROM dbo.event_program_review_team_members WHERE program_id = @programId');
            await transaction
                .request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                .input('leaderUserId', mssql_1.default.UniqueIdentifier, input.leaderUserId)
                .input('changedBy', mssql_1.default.UniqueIdentifier, input.changedBy)
                .query(`
          INSERT INTO dbo.event_program_review_team_members (
            event_id, program_id, user_id, team_role, created_by
          )
          VALUES (@eventId, @programId, @leaderUserId, 'leader', @changedBy)
        `);
            for (const reviewerUserId of input.reviewerUserIds.filter((id) => id !== input.leaderUserId)) {
                await transaction
                    .request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                    .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
                    .input('changedBy', mssql_1.default.UniqueIdentifier, input.changedBy)
                    .query(`
            INSERT INTO dbo.event_program_review_team_members (
              event_id, program_id, user_id, team_role, created_by
            )
            VALUES (@eventId, @programId, @reviewerUserId, 'reviewer', @changedBy)
          `);
            }
            await transaction
                .request()
                .input('leaderUserId', mssql_1.default.UniqueIdentifier, input.leaderUserId)
                .query(`
          INSERT INTO dbo.user_roles (user_id, role_id)
          SELECT @leaderUserId, role.id
          FROM dbo.roles role
          WHERE role.name = 'program_leader'
            AND NOT EXISTS (
              SELECT 1 FROM dbo.user_roles existing
              WHERE existing.user_id = @leaderUserId AND existing.role_id = role.id
            )
        `);
            await transaction.commit();
            return true;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async isProgramLeader(submissionId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.submissions submission
        INNER JOIN dbo.event_program_review_team_members member
          ON member.program_id = submission.program_id
          AND member.user_id = @userId
          AND member.team_role = 'leader'
        WHERE submission.id = @submissionId
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async isProgramReviewer(submissionId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.submissions submission
        INNER JOIN dbo.event_program_review_team_members member
          ON member.program_id = submission.program_id
          AND member.user_id = @userId
        WHERE submission.id = @submissionId
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async isReviewerInSubmissionTeam(submissionId, reviewerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.submissions submission
        INNER JOIN dbo.event_program_review_team_members member
          ON member.program_id = submission.program_id
          AND member.user_id = @reviewerUserId
          AND member.team_role = 'reviewer'
        WHERE submission.id = @submissionId
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async findProgramLeader(submissionId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT TOP 1 users.id AS userId, users.email,
          users.first_name AS firstName, users.last_name AS lastName
        FROM dbo.submissions submission
        INNER JOIN dbo.event_program_review_team_members member
          ON member.program_id = submission.program_id AND member.team_role = 'leader'
        INNER JOIN dbo.users users ON users.id = member.user_id
        WHERE submission.id = @submissionId
      `);
        return result.recordset[0] ?? null;
    }
    async allAssignedReviewsSubmitted(submissionId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT COUNT(1) AS total,
          SUM(CASE WHEN status = 'submitted' THEN 0 ELSE 1 END) AS pending
        FROM dbo.review_assignments
        WHERE submission_id = @submissionId
      `);
        const row = result.recordset[0];
        return (row?.total ?? 0) > 0 && (row?.pending ?? 0) === 0;
    }
    async assignReviewer(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
                .input('reviewTeamId', mssql_1.default.UniqueIdentifier, input.reviewTeamId)
                .input('reviewerUserId', mssql_1.default.UniqueIdentifier, input.reviewerUserId)
                .input('assignedBy', mssql_1.default.UniqueIdentifier, input.assignedBy)
                .input('rubricId', mssql_1.default.UniqueIdentifier, input.rubricId ?? null)
                .input('assessmentFormatVersionId', mssql_1.default.UniqueIdentifier, input.assessmentFormatVersionId ?? null)
                .input('dueAt', mssql_1.default.DateTime2, input.dueAt ?? null)
                .query(`
          INSERT INTO dbo.review_assignments (submission_id, review_team_id, reviewer_user_id, assigned_by, rubric_id, due_at, assessment_format_version_id)
          OUTPUT INSERTED.*
          VALUES (@submissionId, @reviewTeamId, @reviewerUserId, @assignedBy, @rubricId, @dueAt, @assessmentFormatVersionId)
        `);
            await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, result.recordset[0].id)
                .input('actorId', mssql_1.default.UniqueIdentifier, input.assignedBy)
                .query(`
          INSERT INTO dbo.review_workflow_history (assignment_id, action, from_status, to_status, acted_by)
          VALUES (@assignmentId, 'assigned', NULL, 'assigned', @actorId)
        `);
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
                .query("UPDATE dbo.submissions SET status = 'under_review', updated_at = SYSUTCDATETIME() WHERE id = @submissionId AND status IN ('submitted', 'resubmitted')");
            await transaction.commit();
            return result.recordset[0];
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async findReviewerAssignment(submissionId, reviewerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
            .query(`
        SELECT TOP 1 id, status
        FROM dbo.review_assignments
        WHERE submission_id = @submissionId AND reviewer_user_id = @reviewerUserId
      `);
        return result.recordset[0] ?? null;
    }
    async deletePendingAssignment(assignmentId) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
                .query(`
          DELETE assignment
          OUTPUT DELETED.submission_id
          FROM dbo.review_assignments assignment
          WHERE assignment.id = @assignmentId
            AND assignment.status = 'assigned'
            AND NOT EXISTS (SELECT 1 FROM dbo.review_results result WHERE result.assignment_id = assignment.id)
            AND NOT EXISTS (SELECT 1 FROM dbo.review_comments comment WHERE comment.assignment_id = assignment.id)
            AND NOT EXISTS (SELECT 1 FROM dbo.review_file_comments file_comment WHERE file_comment.assignment_id = assignment.id)
        `);
            const submissionId = result.recordset[0]?.submission_id;
            if (submissionId) {
                await transaction.request()
                    .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
                    .query(`
            UPDATE dbo.submissions
            SET status = 'submitted', updated_at = SYSUTCDATETIME()
            WHERE id = @submissionId
              AND status = 'under_review'
              AND NOT EXISTS (SELECT 1 FROM dbo.review_assignments WHERE submission_id = @submissionId)
          `);
            }
            await transaction.commit();
            return Boolean(submissionId);
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async listMyReviews(reviewerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
            .query(`
        SELECT assignment.id, assignment.submission_id, assignment.status, assignment.due_at,
          assignment.submitted_at, submission.title AS submission_title,
          program.name AS program_name, type.name AS submission_type_name,
          event.id AS event_id, event.name AS event_name, event.logo_file_id AS event_logo_file_id
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
        INNER JOIN dbo.submission_types type ON type.id = submission.submission_type_id
        INNER JOIN dbo.events event ON event.id = submission.event_id
        LEFT JOIN dbo.event_programs program ON program.id = submission.program_id
        WHERE assignment.reviewer_user_id = @reviewerUserId
        ORDER BY assignment.created_at DESC
      `);
        return result.recordset;
    }
    async listSubmissionReviews(submissionId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT assignment.id, assignment.submission_id AS submissionId,
          assignment.reviewer_user_id AS reviewerUserId,
          users.first_name AS reviewerFirstName, users.last_name AS reviewerLastName,
          users.email AS reviewerEmail, assignment.status, assignment.due_at AS dueAt,
          assignment.submitted_at AS submittedAt,
          result.recommendation, result.comments, result.score
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.users users ON users.id = assignment.reviewer_user_id
        OUTER APPLY (
          SELECT TOP 1 recommendation, comments, score
          FROM dbo.review_results review_result
          WHERE review_result.assignment_id = assignment.id
          ORDER BY review_result.created_at DESC
        ) result
        WHERE assignment.submission_id = @submissionId
        ORDER BY assignment.created_at ASC
      `);
        return result.recordset;
    }
    async getParticipantFeedback(submissionId, ownerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const submission = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, ownerUserId)
            .query(`
        SELECT TOP 1 id, status FROM dbo.submissions
        WHERE id = @submissionId AND owner_user_id = @ownerUserId AND deleted_at IS NULL
          AND status IN ('changes_requested', 'accepted', 'rejected')
      `);
        if (!submission.recordset[0])
            return null;
        const comments = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT file_comment.id, file_comment.file_id AS fileId,
          file_comment.page_number AS pageNumber, file_comment.section_label AS sectionLabel,
          file_comment.selected_text AS selectedText, file_comment.anchor_json AS anchorJson,
          file_comment.comment_text AS comment, file_comment.created_at AS createdAt,
          file_comment.updated_at AS updatedAt,
          CONCAT(users.first_name, ' ', users.last_name) AS reviewerName
        FROM dbo.review_file_comments file_comment
        INNER JOIN dbo.review_assignments assignment ON assignment.id = file_comment.assignment_id
          AND assignment.status = 'forwarded_to_supervisor'
        INNER JOIN dbo.users users ON users.id = assignment.reviewer_user_id
        WHERE assignment.submission_id = @submissionId
        ORDER BY file_comment.created_at ASC
      `);
        const reviews = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT assignment.id, CONCAT(users.first_name, ' ', users.last_name) AS reviewerName,
          result.recommendation, result.comments, assignment.submitted_at AS submittedAt
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.users users ON users.id = assignment.reviewer_user_id
        OUTER APPLY (
          SELECT TOP 1 recommendation, comments FROM dbo.review_results
          WHERE assignment_id = assignment.id ORDER BY created_at DESC
        ) result
        WHERE assignment.submission_id = @submissionId AND assignment.status = 'forwarded_to_supervisor'
        ORDER BY assignment.submitted_at ASC
      `);
        return { comments: comments.recordset, reviews: reviews.recordset };
    }
    async findReview(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query('SELECT TOP 1 * FROM dbo.review_assignments WHERE id = @id');
        return result.recordset[0] ?? null;
    }
    async getReviewWorkspace(assignmentId, reviewerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const assignment = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
            .query(`
        SELECT TOP 1 assignment.id, assignment.submission_id AS submissionId,
          submission.title, submission.abstract, submission.keywords,
          result.recommendation, result.comments AS reviewComments, result.score
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
        OUTER APPLY (
          SELECT TOP 1 recommendation, comments, score FROM dbo.review_results
          WHERE assignment_id = assignment.id ORDER BY created_at DESC
        ) result
        WHERE assignment.id = @assignmentId AND assignment.reviewer_user_id = @reviewerUserId
      `);
        if (!assignment.recordset[0])
            return null;
        const files = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT stored_file.id, stored_file.original_name AS originalName, stored_file.mime_type AS mimeType,
          stored_file.size_bytes AS sizeBytes, submission_file.file_role AS fileRole,
          submission_file.created_at AS uploadedAt
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.submission_files submission_file ON submission_file.submission_id = assignment.submission_id
        INNER JOIN dbo.files stored_file ON stored_file.id = submission_file.file_id AND stored_file.status = 'active'
        WHERE assignment.id = @assignmentId
        ORDER BY CASE submission_file.file_role WHEN 'abstract' THEN 0 ELSE 1 END, submission_file.created_at DESC
      `);
        const comments = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT id, file_id AS fileId, page_number AS pageNumber, section_label AS sectionLabel,
          selected_text AS selectedText, anchor_json AS anchorJson,
          comment_text AS comment, created_at AS createdAt, updated_at AS updatedAt
        FROM dbo.review_file_comments WHERE assignment_id = @assignmentId ORDER BY created_at ASC
      `);
        return { ...assignment.recordset[0], files: files.recordset, comments: comments.recordset };
    }
    async getReviewAuditWorkspace(assignmentId) {
        const pool = await (0, database_1.getSqlPool)();
        const assignment = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT TOP 1 assignment.id, assignment.submission_id AS submissionId,
          assignment.status, assignment.submitted_at AS submittedAt,
          submission.title, submission.abstract, submission.keywords,
          users.id AS reviewerUserId, users.first_name AS reviewerFirstName,
          users.last_name AS reviewerLastName, users.email AS reviewerEmail,
          result.recommendation, result.comments AS reviewComments, result.score,
          assessment_version.id AS assessmentVersionId,
          assessment_version.version_number AS assessmentVersionNumber,
          assessment_version.definition_json AS assessmentDefinitionJson,
          assessment_version.printable_template_file_id AS assessmentTemplateFileId,
          assessment_format.name AS assessmentFormatName,
          assessment_format.instructions AS assessmentInstructions,
          assessment_response.answers_json AS assessmentAnswersJson,
          assessment_response.calculated_json AS assessmentCalculatedJson,
          assessment_response.recommendation AS assessmentRecommendation,
          assessment_response.proposed_decision AS assessmentProposedDecision,
          assessment_response.comments AS assessmentComments,
          assessment_response.status AS assessmentResponseStatus,
          event.name AS assessmentEventName,
          event.logo_file_id AS assessmentEventLogoFileId,
          submission_type.name AS assessmentSubmissionType,
          knowledge_area.name AS assessmentKnowledgeArea,
          knowledge_line.name AS assessmentKnowledgeLine,
          registration_response.answers_json AS assessmentRegistrationAnswersJson
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
        INNER JOIN dbo.events event ON event.id = submission.event_id
        LEFT JOIN dbo.submission_types submission_type ON submission_type.id = submission.submission_type_id
        LEFT JOIN dbo.event_knowledge_areas knowledge_area ON knowledge_area.id = submission.knowledge_area_id
        LEFT JOIN dbo.event_knowledge_lines knowledge_line ON knowledge_line.id = submission.knowledge_line_id
        INNER JOIN dbo.users users ON users.id = assignment.reviewer_user_id
        LEFT JOIN dbo.event_assessment_format_versions assessment_version ON assessment_version.id = assignment.assessment_format_version_id
        LEFT JOIN dbo.event_assessment_formats assessment_format ON assessment_format.id = assessment_version.format_id
        LEFT JOIN dbo.assessment_responses assessment_response ON assessment_response.review_assignment_id = assignment.id
        OUTER APPLY (
          SELECT TOP 1 form_response.answers_json
          FROM dbo.event_registration_form_responses form_response
          WHERE form_response.registration_id = submission.registration_id
          ORDER BY form_response.submitted_at DESC
        ) registration_response
        OUTER APPLY (
          SELECT TOP 1 recommendation, comments, score FROM dbo.review_results
          WHERE assignment_id = assignment.id ORDER BY created_at DESC
        ) result
        WHERE assignment.id = @assignmentId AND assignment.status IN ('submitted_to_leader', 'forwarded_to_supervisor')
      `);
        if (!assignment.recordset[0])
            return null;
        const files = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT stored_file.id, stored_file.original_name AS originalName, stored_file.mime_type AS mimeType,
          stored_file.size_bytes AS sizeBytes, submission_file.file_role AS fileRole,
          submission_file.created_at AS uploadedAt
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.submission_files submission_file ON submission_file.submission_id = assignment.submission_id
        INNER JOIN dbo.files stored_file ON stored_file.id = submission_file.file_id AND stored_file.status = 'active'
        WHERE assignment.id = @assignmentId
        ORDER BY CASE submission_file.file_role WHEN 'abstract' THEN 0 ELSE 1 END, submission_file.created_at DESC
      `);
        const comments = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT file_comment.id, file_comment.file_id AS fileId,
          file_comment.page_number AS pageNumber, file_comment.section_label AS sectionLabel,
          file_comment.selected_text AS selectedText, file_comment.anchor_json AS anchorJson,
          file_comment.comment_text AS comment, file_comment.created_at AS createdAt,
          file_comment.updated_at AS updatedAt,
          CONCAT(users.first_name, ' ', users.last_name) AS reviewerName
        FROM dbo.review_file_comments file_comment
        INNER JOIN dbo.review_assignments assignment ON assignment.id = file_comment.assignment_id
        INNER JOIN dbo.users users ON users.id = assignment.reviewer_user_id
        WHERE file_comment.assignment_id = @assignmentId
        ORDER BY file_comment.created_at ASC
      `);
        const row = assignment.recordset[0];
        const assessment = row.assessmentVersionId && row.assessmentDefinitionJson ? {
            id: row.id,
            status: row.status,
            versionId: row.assessmentVersionId,
            versionNumber: row.assessmentVersionNumber,
            formatName: row.assessmentFormatName,
            instructions: row.assessmentInstructions,
            definition: parseJson(row.assessmentDefinitionJson, null),
            printableTemplateFileId: row.assessmentTemplateFileId,
            answers: parseJson(row.assessmentAnswersJson, {}),
            calculated: parseJson(row.assessmentCalculatedJson, {}),
            recommendation: row.assessmentRecommendation,
            proposedDecision: row.assessmentProposedDecision,
            comments: row.assessmentComments,
            responseStatus: row.assessmentResponseStatus,
            context: {
                eventName: row.assessmentEventName ?? null,
                eventLogoFileId: row.assessmentEventLogoFileId ?? null,
                submissionTitle: row.title ?? null,
                submissionType: row.assessmentSubmissionType ?? null,
                knowledgeArea: row.assessmentKnowledgeArea ?? null,
                knowledgeLine: row.assessmentKnowledgeLine ?? null,
                registrationAnswers: parseJson(row.assessmentRegistrationAnswersJson, {}),
            },
        } : null;
        return { ...row, files: files.recordset, comments: comments.recordset, assessment };
    }
    async addFileComment(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, input.reviewerUserId)
            .input('fileId', mssql_1.default.UniqueIdentifier, input.fileId)
            .input('pageNumber', mssql_1.default.Int, input.pageNumber ?? null)
            .input('sectionLabel', mssql_1.default.NVarChar(180), input.sectionLabel ?? null)
            .input('selectedText', mssql_1.default.NVarChar(2000), input.selectedText ?? null)
            .input('anchorJson', mssql_1.default.NVarChar(mssql_1.default.MAX), input.anchor ? JSON.stringify(input.anchor) : null)
            .input('comment', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comment)
            .query(`
        IF EXISTS (
          SELECT 1 FROM dbo.review_assignments assignment
          INNER JOIN dbo.submission_files submission_file ON submission_file.submission_id = assignment.submission_id
          WHERE assignment.id = @assignmentId AND assignment.reviewer_user_id = @reviewerUserId
            AND assignment.status IN ('assigned', 'returned_to_reviewer') AND submission_file.file_id = @fileId
        )
        INSERT INTO dbo.review_file_comments (assignment_id, file_id, page_number, section_label, selected_text, anchor_json, comment_text)
        OUTPUT INSERTED.id, INSERTED.file_id AS fileId, INSERTED.page_number AS pageNumber,
          INSERTED.section_label AS sectionLabel, INSERTED.selected_text AS selectedText,
          INSERTED.anchor_json AS anchorJson, INSERTED.comment_text AS comment, INSERTED.created_at AS createdAt
        VALUES (@assignmentId, @fileId, @pageNumber, @sectionLabel, @selectedText, @anchorJson, @comment)
      `);
        return result.recordset[0] ?? null;
    }
    async updateFileComment(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, input.reviewerUserId)
            .input('commentId', mssql_1.default.UniqueIdentifier, input.commentId)
            .input('comment', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comment)
            .query(`
        UPDATE file_comment
        SET comment_text = @comment, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id, INSERTED.file_id AS fileId, INSERTED.page_number AS pageNumber,
          INSERTED.section_label AS sectionLabel, INSERTED.selected_text AS selectedText,
          INSERTED.anchor_json AS anchorJson, INSERTED.comment_text AS comment,
          INSERTED.created_at AS createdAt, INSERTED.updated_at AS updatedAt
        FROM dbo.review_file_comments file_comment
        INNER JOIN dbo.review_assignments assignment ON assignment.id = file_comment.assignment_id
        WHERE file_comment.id = @commentId AND file_comment.assignment_id = @assignmentId
          AND assignment.reviewer_user_id = @reviewerUserId
          AND assignment.status IN ('assigned', 'returned_to_reviewer')
      `);
        return result.recordset[0] ?? null;
    }
    async deleteFileComment(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, input.reviewerUserId)
            .input('commentId', mssql_1.default.UniqueIdentifier, input.commentId)
            .query(`
        DELETE file_comment
        OUTPUT DELETED.id
        FROM dbo.review_file_comments file_comment
        INNER JOIN dbo.review_assignments assignment ON assignment.id = file_comment.assignment_id
        WHERE file_comment.id = @commentId AND file_comment.assignment_id = @assignmentId
          AND assignment.reviewer_user_id = @reviewerUserId
          AND assignment.status IN ('assigned', 'returned_to_reviewer')
      `);
        return Boolean(result.recordset[0]);
    }
    async submitReview(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const assignment = await transaction
                .request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('reviewerUserId', mssql_1.default.UniqueIdentifier, input.reviewerUserId)
                .query(`
          SELECT TOP 1 id, status FROM dbo.review_assignments
          WHERE id = @assignmentId AND reviewer_user_id = @reviewerUserId
            AND status IN ('assigned', 'returned_to_reviewer')
        `);
            if (!assignment.recordset[0]) {
                await transaction.rollback();
                return null;
            }
            await transaction
                .request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('recommendation', mssql_1.default.NVarChar(40), input.recommendation)
                .input('comments', mssql_1.default.NVarChar(mssql_1.default.MAX), input.comments ?? null)
                .input('score', mssql_1.default.Decimal(8, 2), input.score ?? null)
                .query(`
          INSERT INTO dbo.review_results (assignment_id, recommendation, comments, score)
          VALUES (@assignmentId, @recommendation, @comments, @score)
        `);
            const result = await transaction
                .request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .query(`
          UPDATE dbo.review_assignments
          SET status = 'submitted_to_leader', submitted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
          OUTPUT INSERTED.*
          WHERE id = @assignmentId
        `);
            await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('fromStatus', mssql_1.default.NVarChar(40), assignment.recordset[0].status)
                .input('actorId', mssql_1.default.UniqueIdentifier, input.reviewerUserId)
                .query(`
          INSERT INTO dbo.review_workflow_history (assignment_id, action, from_status, to_status, acted_by)
          VALUES (@assignmentId, 'submitted_to_leader', @fromStatus, 'submitted_to_leader', @actorId)
        `);
            await transaction.commit();
            return result.recordset[0];
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async createDecision(input) {
        const submissionStatus = input.decision === 'accepted_with_observations'
            ? 'accepted'
            : input.decision === 'requires_corrections'
                ? 'changes_requested'
                : input.decision;
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const current = await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
                .query(`
          SELECT TOP 1 id, registration_id, status
          FROM dbo.submissions
          WHERE id = @submissionId AND deleted_at IS NULL
        `);
            const submission = current.recordset[0];
            if (!submission) {
                await transaction.rollback();
                return null;
            }
            const result = await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
                .input('decision', mssql_1.default.NVarChar(40), input.decision)
                .input('notes', mssql_1.default.NVarChar(mssql_1.default.MAX), input.notes ?? null)
                .input('decidedBy', mssql_1.default.UniqueIdentifier, input.decidedBy)
                .query(`
          INSERT INTO dbo.review_decisions (submission_id, decision, decision_notes, decided_by)
          OUTPUT INSERTED.*
          VALUES (@submissionId, @decision, @notes, @decidedBy)
        `);
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
                .input('decision', mssql_1.default.NVarChar(40), submissionStatus)
                .query('UPDATE dbo.submissions SET status = @decision, updated_at = SYSUTCDATETIME() WHERE id = @submissionId');
            await transaction
                .request()
                .input('submissionId', mssql_1.default.UniqueIdentifier, input.submissionId)
                .input('fromStatus', mssql_1.default.NVarChar(40), submission?.status ?? null)
                .input('decision', mssql_1.default.NVarChar(40), submissionStatus)
                .input('decidedBy', mssql_1.default.UniqueIdentifier, input.decidedBy)
                .query("INSERT INTO dbo.submission_status_history (submission_id, from_status, to_status, changed_by, reason) VALUES (@submissionId, @fromStatus, @decision, @decidedBy, 'final_decision')");
            if (submissionStatus === 'accepted' && submission?.registration_id) {
                await transaction
                    .request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, submission.registration_id)
                    .query(`
            UPDATE registration
            SET status = CASE
                  WHEN COALESCE(settings.payment_policy, 'immediate') = 'free' THEN 'confirmed'
                  ELSE 'accepted_pending_payment'
                END,
                updated_at = SYSUTCDATETIME()
            FROM dbo.event_registrations registration
            LEFT JOIN dbo.event_settings settings ON settings.event_id = registration.event_id
            WHERE registration.id = @registrationId
              AND registration.status = 'pending_review'
          `);
                await transaction
                    .request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, submission.registration_id)
                    .input('decidedBy', mssql_1.default.UniqueIdentifier, input.decidedBy)
                    .query(`
            MERGE dbo.event_speakers AS target
            USING (
              SELECT
                registration.event_id,
                registration.id AS registration_id,
                LTRIM(RTRIM(CONCAT(profile.first_name, ' ', profile.last_name))) AS name,
                COALESCE(JSON_VALUE(response.answers_json, '$.role'), JSON_VALUE(response.answers_json, '$.cargo'), JSON_VALUE(response.answers_json, '$.puesto'), JSON_VALUE(response.answers_json, '$.position')) AS role,
                COALESCE(JSON_VALUE(response.answers_json, '$.bio'), JSON_VALUE(response.answers_json, '$.biografia'), JSON_VALUE(response.answers_json, '$.resumen'), JSON_VALUE(response.answers_json, '$.abstract'), JSON_VALUE(response.answers_json, '$.semblanza')) AS bio,
                COALESCE(TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.imageFileId')), TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.profilePhoto')), TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.photo')), TRY_CONVERT(uniqueidentifier, JSON_VALUE(response.answers_json, '$.foto'))) AS image_file_id,
                profile.email,
                profile.phone,
                COALESCE(JSON_VALUE(response.answers_json, '$.organization'), JSON_VALUE(response.answers_json, '$.organizacion'), JSON_VALUE(response.answers_json, '$.institucion'), JSON_VALUE(response.answers_json, '$.institution'), profile.institution) AS organization,
                COALESCE(JSON_VALUE(response.answers_json, '$.website'), JSON_VALUE(response.answers_json, '$.websiteUrl'), JSON_VALUE(response.answers_json, '$.sitioWeb')) AS website_url,
                COALESCE(JSON_VALUE(response.answers_json, '$.social'), JSON_VALUE(response.answers_json, '$.socialUrl'), JSON_VALUE(response.answers_json, '$.linkedin'), JSON_VALUE(response.answers_json, '$.perfilSocial')) AS social_url,
                profile.professional_experience_json
              FROM dbo.event_registrations registration
              INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
              LEFT JOIN dbo.event_registration_form_responses response ON response.registration_id = registration.id
              WHERE registration.id = @registrationId
                AND registration.participation_mode <> 'attendee'
            ) AS source
            ON target.source_registration_id = source.registration_id
            WHEN MATCHED THEN
              UPDATE SET
                name = source.name,
                role = source.role,
                bio = source.bio,
                image_file_id = COALESCE(source.image_file_id, target.image_file_id),
                email = source.email,
                phone = source.phone,
                organization = source.organization,
                website_url = source.website_url,
                social_url = source.social_url,
                professional_experience_json = source.professional_experience_json,
                status = 'published',
                deleted_at = NULL,
                updated_by = @decidedBy,
                updated_at = SYSUTCDATETIME()
            WHEN NOT MATCHED BY TARGET THEN
              INSERT (
                event_id, source_registration_id, name, role, bio, image_file_id, email, phone,
                organization, website_url, social_url, professional_experience_json, status, created_by, updated_by
              )
              VALUES (
                source.event_id, source.registration_id, source.name, source.role, source.bio, source.image_file_id, source.email, source.phone,
                source.organization, source.website_url, source.social_url, source.professional_experience_json, 'published', @decidedBy, @decidedBy
              );
          `);
                await transaction
                    .request()
                    .input('registrationId', mssql_1.default.UniqueIdentifier, submission.registration_id)
                    .input('decidedBy', mssql_1.default.UniqueIdentifier, input.decidedBy)
                    .query(`
            INSERT INTO dbo.event_registration_status_history (registration_id, to_status, changed_by, reason)
            SELECT id, status, @decidedBy, 'submission_accepted'
            FROM dbo.event_registrations
            WHERE id = @registrationId
          `);
            }
            await transaction.commit();
            return result.recordset[0];
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
exports.ReviewsRepository = ReviewsRepository;
//# sourceMappingURL=reviews.repository.js.map