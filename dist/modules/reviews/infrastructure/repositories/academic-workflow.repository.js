"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicWorkflowRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
class AcademicWorkflowRepository {
    async listMyScopes(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT DISTINCT scope.eventId, scope.eventName, scope.programId, scope.programName, scope.role
        FROM (
          SELECT assignment.event_id AS eventId, event.name AS eventName,
            assignment.program_id AS programId, program.name AS programName,
            assignment.staff_role AS role
          FROM dbo.event_program_staff_assignments assignment
          INNER JOIN dbo.events event ON event.id = assignment.event_id
          LEFT JOIN dbo.event_programs program ON program.id = assignment.program_id
          WHERE assignment.user_id = @userId AND assignment.is_active = 1

          UNION ALL

          SELECT team.event_id, event.name, team.program_id, program.name, 'leader'
          FROM dbo.event_review_teams team
          INNER JOIN dbo.events event ON event.id = team.event_id
          INNER JOIN dbo.event_programs program ON program.id = team.program_id
          WHERE team.leader_user_id = @userId AND team.is_active = 1

          UNION ALL

          SELECT team.event_id, event.name, team.program_id, program.name, 'reviewer'
          FROM dbo.event_review_team_members member
          INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
          INNER JOIN dbo.events event ON event.id = team.event_id
          INNER JOIN dbo.event_programs program ON program.id = team.program_id
          WHERE member.user_id = @userId AND member.is_active = 1
        ) scope
        ORDER BY scope.eventName, scope.programName, scope.role
      `);
        return result.recordset;
    }
    async getLeaderDashboard(eventId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT team.id AS teamId, team.name AS teamName, program.id AS programId, program.name AS programName,
          event.name AS eventName,
          COALESCE((
            SELECT reviewer.id AS userId, reviewer.first_name AS firstName, reviewer.last_name AS lastName,
              reviewer.email, member.created_at AS joinedAt
            FROM dbo.event_review_team_members member
            INNER JOIN dbo.users reviewer ON reviewer.id = member.user_id
            WHERE member.team_id = team.id AND member.is_active = 1
            ORDER BY reviewer.first_name, reviewer.last_name
            FOR JSON PATH
          ), '[]') AS reviewersJson
        FROM dbo.event_review_teams team
        INNER JOIN dbo.event_programs program ON program.id = team.program_id
        INNER JOIN dbo.events event ON event.id = team.event_id
        WHERE team.event_id = @eventId AND team.leader_user_id = @userId AND team.is_active = 1
        ORDER BY program.sort_order, program.name, team.name;

        SELECT submission.id, submission.title, submission.status, submission.created_at AS createdAt,
          submission.program_id AS programId, program.name AS programName,
          submission.submission_type_id AS submissionTypeId, submission_type.name AS submissionTypeName,
          team.id AS teamId, team.name AS teamName,
          COALESCE((
            SELECT assignment.id, assignment.status, assignment.due_at AS dueAt,
              assignment.submitted_at AS submittedAt, reviewer.id AS reviewerUserId,
              reviewer.first_name AS reviewerFirstName, reviewer.last_name AS reviewerLastName,
              reviewer.email AS reviewerEmail
            FROM dbo.review_assignments assignment
            INNER JOIN dbo.users reviewer ON reviewer.id = assignment.reviewer_user_id
            WHERE assignment.submission_id = submission.id AND assignment.review_team_id = team.id
            ORDER BY assignment.created_at
            FOR JSON PATH
          ), '[]') AS assignmentsJson
        FROM dbo.submissions submission
        INNER JOIN dbo.event_review_teams team
          ON team.event_id = submission.event_id AND team.program_id = submission.program_id
          AND team.leader_user_id = @userId AND team.is_active = 1
        INNER JOIN dbo.event_programs program ON program.id = submission.program_id
        INNER JOIN dbo.submission_types submission_type ON submission_type.id = submission.submission_type_id
        WHERE submission.event_id = @eventId AND submission.deleted_at IS NULL AND submission.status <> 'draft'
        ORDER BY CASE submission.status
          WHEN 'submitted' THEN 0 WHEN 'resubmitted' THEN 0 WHEN 'under_review' THEN 1
          WHEN 'changes_requested' THEN 2 WHEN 'accepted' THEN 3 WHEN 'rejected' THEN 3 ELSE 4 END,
          submission.created_at DESC;
      `);
        const recordsets = result.recordsets;
        const programRows = recordsets[0] ?? [];
        const submissionRows = recordsets[1] ?? [];
        const programs = programRows.map((row) => ({
            teamId: String(row.teamId),
            teamName: String(row.teamName),
            programId: String(row.programId),
            programName: String(row.programName),
            eventName: String(row.eventName),
            reviewers: JSON.parse(String(row.reviewersJson || '[]')),
        }));
        const submissions = submissionRows.map((row) => ({
            id: String(row.id),
            title: String(row.title),
            status: String(row.status),
            createdAt: row.createdAt,
            programId: String(row.programId),
            programName: String(row.programName),
            submissionTypeId: String(row.submissionTypeId),
            submissionTypeName: String(row.submissionTypeName),
            teamId: String(row.teamId),
            teamName: String(row.teamName),
            assignments: JSON.parse(String(row.assignmentsJson || '[]')),
        }));
        const assignments = submissions.flatMap((submission) => submission.assignments);
        return {
            eventId,
            eventName: programs[0]?.eventName ?? null,
            programs,
            submissions,
            summary: {
                totalSubmissions: submissions.length,
                unassignedSubmissions: submissions.filter((submission) => submission.assignments.length === 0 && ['submitted', 'resubmitted'].includes(submission.status)).length,
                reviewsInProgress: assignments.filter((assignment) => ['assigned', 'returned_to_reviewer'].includes(assignment.status)).length,
                awaitingLeader: assignments.filter((assignment) => assignment.status === 'submitted_to_leader').length,
                forwardedToSupervisor: assignments.filter((assignment) => assignment.status === 'forwarded_to_supervisor').length,
            },
        };
    }
    async getEventContext(eventId, userId, includeMembers, unrestrictedPrograms = false) {
        const pool = await (0, database_1.getSqlPool)();
        const event = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT TOP 1 id, name, tenant_id AS tenantId FROM dbo.events WHERE id = @eventId
      `);
        if (!event.recordset[0])
            return null;
        const programs = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('unrestricted', mssql_1.default.Bit, unrestrictedPrograms)
            .query(`
        SELECT program.id, program.name
        FROM dbo.event_programs program
        WHERE program.event_id = @eventId AND program.is_active = 1
          AND (
            @unrestricted = 1
            OR EXISTS (
              SELECT 1 FROM dbo.event_program_staff_assignments staff
              WHERE staff.event_id = @eventId AND staff.user_id = @userId AND staff.is_active = 1
                AND (staff.program_id IS NULL OR staff.program_id = program.id)
            )
            OR EXISTS (
              SELECT 1 FROM dbo.event_review_teams team
              WHERE team.program_id = program.id AND team.leader_user_id = @userId AND team.is_active = 1
            )
            OR EXISTS (
              SELECT 1 FROM dbo.event_review_team_members member
              INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
              WHERE team.program_id = program.id AND member.user_id = @userId AND member.is_active = 1
            )
          )
        ORDER BY program.sort_order, program.name
      `);
        const members = includeMembers ? await pool.request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, event.recordset[0].tenantId)
            .query(`
        SELECT membership.user_id AS userId, membership.tenant_role AS tenantRole,
          person.first_name AS firstName, person.last_name AS lastName, person.email,
          COALESCE((
            SELECT profile.academic_role AS academicRole
            FROM dbo.tenant_user_academic_roles profile
            WHERE profile.tenant_id = membership.tenant_id AND profile.user_id = membership.user_id
            ORDER BY profile.academic_role
            FOR JSON PATH
          ), '[]') AS academicRolesJson
        FROM dbo.tenant_users membership
        INNER JOIN dbo.users person ON person.id = membership.user_id AND person.status = 'active'
        WHERE membership.tenant_id = @tenantId
        ORDER BY person.first_name, person.last_name
      `) : { recordset: [] };
        const mappedMembers = members.recordset.map((member) => ({
            ...member,
            academicRoles: JSON.parse(String(member.academicRolesJson || '[]')).map((item) => item.academicRole),
            academicRolesJson: undefined,
        }));
        return { event: event.recordset[0], programs: programs.recordset, members: mappedMembers };
    }
    async hasEventAccess(eventId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.event_program_staff_assignments assignment
          WHERE assignment.event_id = @eventId AND assignment.user_id = @userId AND assignment.is_active = 1
          UNION ALL
          SELECT 1 FROM dbo.event_review_teams team
          WHERE team.event_id = @eventId AND team.leader_user_id = @userId AND team.is_active = 1
          UNION ALL
          SELECT 1 FROM dbo.event_review_team_members member
          INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
          WHERE team.event_id = @eventId AND member.user_id = @userId AND member.is_active = 1
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async isSupervisor(eventId, programId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('programId', mssql_1.default.UniqueIdentifier, programId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.event_program_staff_assignments
          WHERE event_id = @eventId AND user_id = @userId AND staff_role = 'supervisor' AND is_active = 1
            AND (program_id IS NULL OR program_id = @programId)
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async isSupervisorForSubmission(submissionId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM dbo.submissions submission
          INNER JOIN dbo.event_program_staff_assignments assignment
            ON assignment.event_id = submission.event_id
           AND (assignment.program_id IS NULL OR assignment.program_id = submission.program_id)
          WHERE submission.id = @submissionId AND assignment.user_id = @userId
            AND assignment.staff_role = 'supervisor' AND assignment.is_active = 1
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async isLeaderForAssignment(assignmentId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.review_assignments assignment
          INNER JOIN dbo.event_review_teams team ON team.id = assignment.review_team_id AND team.is_active = 1
          WHERE assignment.id = @assignmentId AND team.leader_user_id = @userId
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async isLeaderForSubmission(submissionId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.submissions submission
          INNER JOIN dbo.event_review_teams team
            ON team.event_id = submission.event_id AND team.program_id = submission.program_id AND team.is_active = 1
          WHERE submission.id = @submissionId AND team.leader_user_id = @userId
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async isSupervisorForAssignment(assignmentId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.review_assignments review_assignment
          INNER JOIN dbo.submissions submission ON submission.id = review_assignment.submission_id
          INNER JOIN dbo.event_program_staff_assignments staff
            ON staff.event_id = submission.event_id
           AND (staff.program_id IS NULL OR staff.program_id = submission.program_id)
          WHERE review_assignment.id = @assignmentId AND staff.user_id = @userId
            AND staff.staff_role = 'supervisor' AND staff.is_active = 1
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async listTeams(eventId, userId, unrestricted = false) {
        const pool = await (0, database_1.getSqlPool)();
        const rows = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('unrestricted', mssql_1.default.Bit, unrestricted)
            .query(`
        SELECT team.id AS teamId, team.name AS teamName, program.id AS programId, program.name AS programName,
          leader.id AS leaderUserId, leader.first_name AS leaderFirstName,
          leader.last_name AS leaderLastName, leader.email AS leaderEmail,
          reviewer.id AS reviewerUserId, reviewer.first_name AS reviewerFirstName,
          reviewer.last_name AS reviewerLastName, reviewer.email AS reviewerEmail
        FROM dbo.event_review_teams team
        INNER JOIN dbo.event_programs program ON program.id = team.program_id
        INNER JOIN dbo.users leader ON leader.id = team.leader_user_id
        LEFT JOIN dbo.event_review_team_members member ON member.team_id = team.id AND member.is_active = 1
        LEFT JOIN dbo.users reviewer ON reviewer.id = member.user_id
        WHERE team.event_id = @eventId AND team.is_active = 1
          AND (
            @unrestricted = 1
            OR team.leader_user_id = @userId
            OR EXISTS (
              SELECT 1 FROM dbo.event_program_staff_assignments staff
              WHERE staff.event_id = team.event_id AND staff.user_id = @userId
                AND staff.staff_role = 'supervisor' AND staff.is_active = 1
                AND (staff.program_id IS NULL OR staff.program_id = team.program_id)
            )
            OR EXISTS (
              SELECT 1 FROM dbo.event_review_team_members mine
              WHERE mine.team_id = team.id AND mine.user_id = @userId AND mine.is_active = 1
            )
          )
        ORDER BY program.name, team.name, reviewer.first_name, reviewer.last_name
      `);
        const teams = new Map();
        for (const row of rows.recordset) {
            const team = teams.get(row.teamId) ?? {
                teamId: row.teamId,
                teamName: row.teamName,
                programId: row.programId,
                programName: row.programName,
                leader: { userId: row.leaderUserId, firstName: row.leaderFirstName, lastName: row.leaderLastName, email: row.leaderEmail },
                reviewers: [],
            };
            if (row.reviewerUserId)
                team.reviewers.push({
                    userId: row.reviewerUserId,
                    firstName: row.reviewerFirstName ?? '',
                    lastName: row.reviewerLastName ?? '',
                    email: row.reviewerEmail ?? '',
                });
            teams.set(row.teamId, team);
        }
        return Array.from(teams.values());
    }
    async listSupervisors(eventId, userId, unrestricted = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('unrestricted', mssql_1.default.Bit, unrestricted)
            .query(`
        SELECT assignment.id, assignment.program_id AS programId, program.name AS programName,
          person.id AS userId, person.first_name AS firstName, person.last_name AS lastName, person.email
        FROM dbo.event_program_staff_assignments assignment
        INNER JOIN dbo.users person ON person.id = assignment.user_id
        LEFT JOIN dbo.event_programs program ON program.id = assignment.program_id
        WHERE assignment.event_id = @eventId AND assignment.staff_role = 'supervisor' AND assignment.is_active = 1
          AND (@unrestricted = 1 OR assignment.user_id = @userId)
        ORDER BY program.name, person.first_name, person.last_name
      `);
        return result.recordset;
    }
    async listEvaluators(eventId, userId, unrestricted = false) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('unrestricted', mssql_1.default.Bit, unrestricted)
            .query(`
        SELECT DISTINCT assignment.program_id AS programId, program.name AS programName,
          person.id AS userId, person.first_name AS firstName, person.last_name AS lastName, person.email
        FROM dbo.event_program_staff_assignments assignment
        INNER JOIN dbo.users person ON person.id = assignment.user_id
        LEFT JOIN dbo.event_programs program ON program.id = assignment.program_id
        WHERE assignment.event_id = @eventId AND assignment.staff_role = 'evaluator' AND assignment.is_active = 1
          AND (
            @unrestricted = 1
            OR EXISTS (
              SELECT 1 FROM dbo.event_program_staff_assignments supervisor
              WHERE supervisor.event_id = assignment.event_id AND supervisor.user_id = @userId
                AND supervisor.staff_role = 'supervisor' AND supervisor.is_active = 1
                AND (supervisor.program_id IS NULL OR supervisor.program_id = assignment.program_id)
            )
          )
        ORDER BY program.name, person.first_name, person.last_name
      `);
        return result.recordset;
    }
    async saveTeam(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const previousAssignments = input.teamId
                ? await transaction.request()
                    .input('teamId', mssql_1.default.UniqueIdentifier, input.teamId)
                    .query(`
            SELECT leader_user_id AS userId
            FROM dbo.event_review_teams
            WHERE id = @teamId AND is_active = 1
            UNION
            SELECT member.user_id
            FROM dbo.event_review_team_members member
            INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
            WHERE member.team_id = @teamId AND member.is_active = 1
          `)
                : { recordset: [] };
            const membership = await transaction.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                .input('leaderUserId', mssql_1.default.UniqueIdentifier, input.leaderUserId)
                .query(`
          SELECT TOP 1 event.tenant_id
          FROM dbo.events event
          INNER JOIN dbo.event_programs program ON program.event_id = event.id AND program.id = @programId
          INNER JOIN dbo.tenant_users membership ON membership.tenant_id = event.tenant_id AND membership.user_id = @leaderUserId
          WHERE event.id = @eventId
        `);
            if (!membership.recordset[0])
                throw new app_error_1.AppError('El líder debe pertenecer a la organización del evento.', 400, 'LEADER_NOT_IN_TENANT');
            if (!input.allowLeaderRoleOverride) {
                const leaderProfile = await transaction.request()
                    .input('tenantId', mssql_1.default.UniqueIdentifier, membership.recordset[0].tenant_id)
                    .input('userId', mssql_1.default.UniqueIdentifier, input.leaderUserId)
                    .query(`
            SELECT CASE WHEN EXISTS (
              SELECT 1 FROM dbo.tenant_user_academic_roles
              WHERE tenant_id = @tenantId AND user_id = @userId AND academic_role = 'leader'
            ) THEN 1 ELSE 0 END AS allowed
          `);
                if (!leaderProfile.recordset[0]?.allowed) {
                    throw new app_error_1.AppError('La persona seleccionada no tiene habilitado el perfil Líder. Activa la excepción para este programa si deseas utilizarla.', 409, 'LEADER_PROFILE_REQUIRED');
                }
            }
            const allUsers = Array.from(new Set([input.leaderUserId, ...input.reviewerUserIds]));
            for (const userId of allUsers) {
                const belongs = await transaction.request()
                    .input('tenantId', mssql_1.default.UniqueIdentifier, membership.recordset[0].tenant_id)
                    .input('userId', mssql_1.default.UniqueIdentifier, userId)
                    .query('SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.tenant_users WHERE tenant_id = @tenantId AND user_id = @userId) THEN 1 ELSE 0 END AS allowed');
                if (!belongs.recordset[0]?.allowed)
                    throw new app_error_1.AppError('Todos los integrantes deben pertenecer a la organización del evento.', 400, 'TEAM_MEMBER_NOT_IN_TENANT');
            }
            const reviewerIds = Array.from(new Set(input.reviewerUserIds.filter((id) => id !== input.leaderUserId)));
            if (!input.allowReviewerRoleOverride && reviewerIds.length) {
                const reviewerProfiles = await transaction.request()
                    .input('tenantId', mssql_1.default.UniqueIdentifier, membership.recordset[0].tenant_id)
                    .input('usersJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(reviewerIds))
                    .query(`
            SELECT COUNT(DISTINCT profile.user_id) AS total
            FROM dbo.tenant_user_academic_roles profile
            INNER JOIN OPENJSON(@usersJson) WITH (user_id UNIQUEIDENTIFIER '$') selected
              ON selected.user_id = profile.user_id
            WHERE profile.tenant_id = @tenantId AND profile.academic_role = 'reviewer'
          `);
                if ((reviewerProfiles.recordset[0]?.total ?? 0) !== reviewerIds.length) {
                    throw new app_error_1.AppError('Uno o más integrantes no tienen habilitado el perfil Revisor. Activa la excepción para este programa si deseas utilizarlos.', 409, 'REVIEWER_PROFILE_REQUIRED');
                }
            }
            let teamId = input.teamId;
            if (teamId) {
                const updated = await transaction.request()
                    .input('teamId', mssql_1.default.UniqueIdentifier, teamId)
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                    .input('name', mssql_1.default.NVarChar(180), input.name)
                    .input('leaderUserId', mssql_1.default.UniqueIdentifier, input.leaderUserId)
                    .query(`
            UPDATE dbo.event_review_teams
            SET name = @name, leader_user_id = @leaderUserId, updated_at = SYSUTCDATETIME()
            WHERE id = @teamId AND event_id = @eventId AND program_id = @programId AND is_active = 1
          `);
                if (!(updated.rowsAffected[0] ?? 0))
                    throw new app_error_1.AppError('Equipo no encontrado.', 404, 'REVIEW_TEAM_NOT_FOUND');
            }
            else {
                const created = await transaction.request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('programId', mssql_1.default.UniqueIdentifier, input.programId)
                    .input('name', mssql_1.default.NVarChar(180), input.name)
                    .input('leaderUserId', mssql_1.default.UniqueIdentifier, input.leaderUserId)
                    .input('changedBy', mssql_1.default.UniqueIdentifier, input.changedBy)
                    .query(`
            INSERT INTO dbo.event_review_teams (event_id, program_id, name, leader_user_id, created_by)
            OUTPUT INSERTED.id
            VALUES (@eventId, @programId, @name, @leaderUserId, @changedBy)
          `);
                teamId = created.recordset[0].id;
            }
            await transaction.request().input('teamId', mssql_1.default.UniqueIdentifier, teamId)
                .query('UPDATE dbo.event_review_team_members SET is_active = 0, updated_at = SYSUTCDATETIME() WHERE team_id = @teamId AND is_active = 1');
            for (const reviewerUserId of Array.from(new Set(input.reviewerUserIds.filter((id) => id !== input.leaderUserId)))) {
                await transaction.request()
                    .input('teamId', mssql_1.default.UniqueIdentifier, teamId)
                    .input('userId', mssql_1.default.UniqueIdentifier, reviewerUserId)
                    .input('changedBy', mssql_1.default.UniqueIdentifier, input.changedBy)
                    .query(`
            IF EXISTS (SELECT 1 FROM dbo.event_review_team_members WHERE team_id = @teamId AND user_id = @userId)
              UPDATE dbo.event_review_team_members SET is_active = 1, assigned_by = @changedBy, updated_at = SYSUTCDATETIME()
              WHERE team_id = @teamId AND user_id = @userId;
            ELSE
              INSERT INTO dbo.event_review_team_members (team_id, user_id, assigned_by)
              VALUES (@teamId, @userId, @changedBy);
          `);
            }
            await this.syncWorkspaceRoles(transaction, Array.from(new Set([
                ...previousAssignments.recordset.map((assignment) => assignment.userId),
                input.leaderUserId,
                ...reviewerIds,
            ])));
            await transaction.commit();
            return teamId;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async saveSupervisor(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const valid = await transaction.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
                .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                .query(`
          SELECT CASE WHEN EXISTS (
            SELECT 1 FROM dbo.events event
            INNER JOIN dbo.tenant_users member ON member.tenant_id = event.tenant_id AND member.user_id = @userId
            WHERE event.id = @eventId
              AND (@programId IS NULL OR EXISTS (SELECT 1 FROM dbo.event_programs WHERE id = @programId AND event_id = @eventId))
          ) THEN 1 ELSE 0 END AS allowed
        `);
            if (!valid.recordset[0]?.allowed)
                throw new app_error_1.AppError('El supervisor debe pertenecer a la organización y al alcance indicado.', 400, 'SUPERVISOR_SCOPE_INVALID');
            if (!input.allowRoleOverride) {
                const profile = await transaction.request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                    .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                    .query(`
            SELECT CASE WHEN EXISTS (
              SELECT 1
              FROM dbo.events event
              INNER JOIN dbo.tenant_user_academic_roles academic_role
                ON academic_role.tenant_id = event.tenant_id
               AND academic_role.user_id = @userId
               AND academic_role.academic_role = 'supervisor'
              WHERE event.id = @eventId
            ) THEN 1 ELSE 0 END AS allowed
          `);
                if (!profile.recordset[0]?.allowed) {
                    throw new app_error_1.AppError('La persona seleccionada no tiene habilitado el perfil Supervisor. Activa la excepción para este programa si deseas utilizarla.', 409, 'SUPERVISOR_PROFILE_REQUIRED');
                }
            }
            const previousSupervisors = await transaction.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
                .query(`
          SELECT user_id AS userId
          FROM dbo.event_program_staff_assignments
          WHERE event_id = @eventId
            AND ((program_id = @programId) OR (program_id IS NULL AND @programId IS NULL))
            AND staff_role = 'supervisor' AND is_active = 1
        `);
            await transaction.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
                .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                .query(`
          UPDATE dbo.event_program_staff_assignments
          SET is_active = 0, updated_at = SYSUTCDATETIME()
          WHERE event_id = @eventId
            AND ((program_id = @programId) OR (program_id IS NULL AND @programId IS NULL))
            AND staff_role = 'supervisor' AND is_active = 1 AND user_id <> @userId
        `);
            await transaction.request()
                .input('eventId', mssql_1.default.UniqueIdentifier, input.eventId)
                .input('programId', mssql_1.default.UniqueIdentifier, input.programId ?? null)
                .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
                .input('assignedBy', mssql_1.default.UniqueIdentifier, input.assignedBy)
                .query(`
          IF EXISTS (
            SELECT 1 FROM dbo.event_program_staff_assignments
            WHERE event_id = @eventId AND ((program_id = @programId) OR (program_id IS NULL AND @programId IS NULL))
              AND user_id = @userId AND staff_role = 'supervisor'
          )
            UPDATE dbo.event_program_staff_assignments
            SET is_active = 1, assigned_by = @assignedBy, updated_at = SYSUTCDATETIME()
            WHERE event_id = @eventId AND ((program_id = @programId) OR (program_id IS NULL AND @programId IS NULL))
              AND user_id = @userId AND staff_role = 'supervisor';
          ELSE
            INSERT INTO dbo.event_program_staff_assignments (event_id, program_id, user_id, staff_role, assigned_by)
            VALUES (@eventId, @programId, @userId, 'supervisor', @assignedBy);
        `);
            await this.syncWorkspaceRoles(transaction, Array.from(new Set([
                ...previousSupervisors.recordset.map((assignment) => assignment.userId),
                input.userId,
            ])));
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async canAssignReviewer(submissionId, teamId, reviewerUserId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('teamId', mssql_1.default.UniqueIdentifier, teamId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1
          FROM dbo.submissions submission
          INNER JOIN dbo.event_review_teams team
            ON team.id = @teamId AND team.event_id = submission.event_id AND team.program_id = submission.program_id AND team.is_active = 1
          INNER JOIN dbo.event_review_team_members member
            ON member.team_id = team.id AND member.user_id = @reviewerUserId AND member.is_active = 1
          INNER JOIN dbo.event_program_staff_assignments supervisor
            ON supervisor.event_id = submission.event_id
           AND (supervisor.program_id IS NULL OR supervisor.program_id = submission.program_id)
           AND supervisor.user_id = @userId AND supervisor.staff_role = 'supervisor' AND supervisor.is_active = 1
          WHERE submission.id = @submissionId
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async isTeamReviewerForSubmission(submissionId, teamId, reviewerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .input('teamId', mssql_1.default.UniqueIdentifier, teamId)
            .input('reviewerUserId', mssql_1.default.UniqueIdentifier, reviewerUserId)
            .query(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM dbo.submissions submission
          INNER JOIN dbo.event_review_teams team
            ON team.id = @teamId AND team.event_id = submission.event_id AND team.program_id = submission.program_id AND team.is_active = 1
          INNER JOIN dbo.event_review_team_members member
            ON member.team_id = team.id AND member.user_id = @reviewerUserId AND member.is_active = 1
          WHERE submission.id = @submissionId
        ) THEN 1 ELSE 0 END AS allowed
      `);
        return Boolean(result.recordset[0]?.allowed);
    }
    async transitionReview(input) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const current = await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .query('SELECT TOP 1 status FROM dbo.review_assignments WITH (UPDLOCK, ROWLOCK) WHERE id = @assignmentId');
            const fromStatus = current.recordset[0]?.status;
            if (!fromStatus)
                throw new app_error_1.AppError('Revisión no encontrada.', 404, 'REVIEW_NOT_FOUND');
            if (!input.allowedFrom.includes(fromStatus))
                throw new app_error_1.AppError('La revisión no está en una etapa válida para esta acción.', 409, 'REVIEW_INVALID_TRANSITION');
            await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('toStatus', mssql_1.default.NVarChar(40), input.toStatus)
                .query('UPDATE dbo.review_assignments SET status = @toStatus, updated_at = SYSUTCDATETIME() WHERE id = @assignmentId');
            await transaction.request()
                .input('assignmentId', mssql_1.default.UniqueIdentifier, input.assignmentId)
                .input('action', mssql_1.default.NVarChar(50), input.action)
                .input('fromStatus', mssql_1.default.NVarChar(40), fromStatus)
                .input('toStatus', mssql_1.default.NVarChar(40), input.toStatus)
                .input('reason', mssql_1.default.NVarChar(mssql_1.default.MAX), input.reason ?? null)
                .input('actorId', mssql_1.default.UniqueIdentifier, input.actorId)
                .query(`
          INSERT INTO dbo.review_workflow_history (assignment_id, action, from_status, to_status, reason, acted_by)
          VALUES (@assignmentId, @action, @fromStatus, @toStatus, @reason, @actorId)
        `);
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async listReviewHistory(assignmentId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT history.id, history.action, history.from_status AS fromStatus,
          history.to_status AS toStatus, history.reason, history.created_at AS createdAt,
          actor.id AS actorUserId, actor.first_name AS actorFirstName, actor.last_name AS actorLastName
        FROM dbo.review_workflow_history history
        INNER JOIN dbo.users actor ON actor.id = history.acted_by
        WHERE history.assignment_id = @assignmentId
        ORDER BY history.created_at ASC
      `);
        return result.recordset;
    }
    async allReviewsForwarded(submissionId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('submissionId', mssql_1.default.UniqueIdentifier, submissionId)
            .query(`
        SELECT CASE WHEN EXISTS (SELECT 1 FROM dbo.review_assignments WHERE submission_id = @submissionId)
          AND NOT EXISTS (
            SELECT 1 FROM dbo.review_assignments
            WHERE submission_id = @submissionId AND status <> 'forwarded_to_supervisor'
          ) THEN 1 ELSE 0 END AS ready
      `);
        return Boolean(result.recordset[0]?.ready);
    }
    async assignmentNotificationData(assignmentId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('assignmentId', mssql_1.default.UniqueIdentifier, assignmentId)
            .query(`
        SELECT submission.title AS submissionTitle,
          reviewer.id AS reviewerUserId, reviewer.email AS reviewerEmail,
          leader.id AS leaderUserId, leader.email AS leaderEmail
        FROM dbo.review_assignments assignment
        INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
        INNER JOIN dbo.users reviewer ON reviewer.id = assignment.reviewer_user_id
        LEFT JOIN dbo.event_review_teams team ON team.id = assignment.review_team_id
        LEFT JOIN dbo.users leader ON leader.id = team.leader_user_id
        WHERE assignment.id = @assignmentId
      `);
        return result.recordset[0] ?? null;
    }
    async syncWorkspaceRoles(transaction, userIds) {
        for (const userId of Array.from(new Set(userIds))) {
            await transaction.request()
                .input('userId', mssql_1.default.UniqueIdentifier, userId)
                .query(`
          DELETE user_role
          FROM dbo.user_roles user_role
          INNER JOIN dbo.roles role ON role.id = user_role.role_id
          WHERE user_role.user_id = @userId
            AND role.name IN ('event_supervisor', 'review_team_leader', 'academic_reviewer', 'event_evaluator')
            AND NOT (
              (role.name = 'event_supervisor' AND EXISTS (
                SELECT 1 FROM dbo.event_program_staff_assignments assignment
                WHERE assignment.user_id = @userId AND assignment.staff_role = 'supervisor' AND assignment.is_active = 1
              ))
              OR (role.name = 'event_evaluator' AND EXISTS (
                SELECT 1 FROM dbo.event_program_staff_assignments assignment
                WHERE assignment.user_id = @userId AND assignment.staff_role = 'evaluator' AND assignment.is_active = 1
              ))
              OR (role.name = 'review_team_leader' AND EXISTS (
                SELECT 1 FROM dbo.event_review_teams team
                WHERE team.leader_user_id = @userId AND team.is_active = 1
              ))
              OR (role.name = 'academic_reviewer' AND EXISTS (
                SELECT 1 FROM dbo.event_review_team_members member
                INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
                WHERE member.user_id = @userId AND member.is_active = 1
              ))
            );

          INSERT INTO dbo.user_roles (user_id, role_id)
          SELECT @userId, role.id
          FROM dbo.roles role
          WHERE (
            (role.name = 'event_supervisor' AND EXISTS (
              SELECT 1 FROM dbo.event_program_staff_assignments assignment
              WHERE assignment.user_id = @userId AND assignment.staff_role = 'supervisor' AND assignment.is_active = 1
            ))
            OR (role.name = 'event_evaluator' AND EXISTS (
              SELECT 1 FROM dbo.event_program_staff_assignments assignment
              WHERE assignment.user_id = @userId AND assignment.staff_role = 'evaluator' AND assignment.is_active = 1
            ))
            OR (role.name = 'review_team_leader' AND EXISTS (
              SELECT 1 FROM dbo.event_review_teams team
              WHERE team.leader_user_id = @userId AND team.is_active = 1
            ))
            OR (role.name = 'academic_reviewer' AND EXISTS (
              SELECT 1 FROM dbo.event_review_team_members member
              INNER JOIN dbo.event_review_teams team ON team.id = member.team_id AND team.is_active = 1
              WHERE member.user_id = @userId AND member.is_active = 1
            ))
          )
          AND NOT EXISTS (
            SELECT 1 FROM dbo.user_roles existing
            WHERE existing.user_id = @userId AND existing.role_id = role.id
          );
        `);
        }
    }
}
exports.AcademicWorkflowRepository = AcademicWorkflowRepository;
//# sourceMappingURL=academic-workflow.repository.js.map