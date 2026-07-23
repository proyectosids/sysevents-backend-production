"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const app_error_1 = require("../../../../shared/errors/app-error");
const dimensionSql = {
    program: {
        key: "COALESCE(CONVERT(nvarchar(36), program.id), '__none__')",
        label: "COALESCE(program.name, 'Sin programa')",
    },
    knowledgeArea: {
        key: "COALESCE(CONVERT(nvarchar(36), area.id), '__none__')",
        label: "COALESCE(area.name, 'Sin área')",
    },
    knowledgeLine: {
        key: "COALESCE(CONVERT(nvarchar(36), knowledge_line.id), '__none__')",
        label: "COALESCE(knowledge_line.name, 'Sin línea')",
    },
    registrationType: {
        key: "COALESCE(CONVERT(nvarchar(36), registration_type.id), '__none__')",
        label: "COALESCE(registration_type.name, 'Sin tipo')",
    },
    registrationStatus: {
        key: "COALESCE(registration.status, '__none__')",
        label: "COALESCE(registration.status, 'Sin estado')",
    },
    participationMode: {
        key: "COALESCE(registration.participation_mode, '__none__')",
        label: "CASE registration.participation_mode WHEN 'attendee' THEN 'Asistente' WHEN 'presenter' THEN 'Ponente' ELSE 'Sin modalidad' END",
    },
    institution: {
        key: "COALESCE(NULLIF(LTRIM(RTRIM(profile.institution)), ''), '__none__')",
        label: "COALESCE(NULLIF(LTRIM(RTRIM(profile.institution)), ''), 'Sin institución')",
    },
    country: {
        key: "COALESCE(NULLIF(LTRIM(RTRIM(profile.country)), ''), '__none__')",
        label: "COALESCE(NULLIF(LTRIM(RTRIM(profile.country)), ''), 'Sin país')",
    },
    submissionType: {
        key: "COALESCE(CONVERT(nvarchar(36), submission_type.id), '__none__')",
        label: "COALESCE(submission_type.name, 'Sin tipo de trabajo')",
    },
    submissionStatus: {
        key: "COALESCE(submission.status, '__none__')",
        label: "COALESCE(submission.status, 'Sin trabajo')",
    },
};
const reportFromSql = `
  FROM dbo.event_registrations registration
  INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
  INNER JOIN dbo.event_registration_types registration_type ON registration_type.id = registration.registration_type_id
  LEFT JOIN dbo.event_programs program ON program.id = registration.program_id
  LEFT JOIN dbo.submissions submission ON submission.registration_id = registration.id AND submission.deleted_at IS NULL
  LEFT JOIN dbo.submission_types submission_type ON submission_type.id = submission.submission_type_id
  LEFT JOIN dbo.event_knowledge_areas area ON area.id = COALESCE(registration.knowledge_area_id, submission.knowledge_area_id)
  LEFT JOIN dbo.event_knowledge_lines knowledge_line ON knowledge_line.id = COALESCE(registration.knowledge_line_id, submission.knowledge_line_id)
`;
class ReportsRepository {
    async getScope(eventId, userId, canViewAllPrograms) {
        const pool = await (0, database_1.getSqlPool)();
        const request = pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId);
        const result = await request.query(`
      SELECT program.id, program.name
      FROM dbo.event_programs program
      ${canViewAllPrograms ? '' : `INNER JOIN dbo.event_program_review_team_members member
        ON member.program_id = program.id AND member.user_id = @userId AND member.team_role = 'leader'`}
      WHERE program.event_id = @eventId AND program.deleted_at IS NULL
      ORDER BY program.sort_order, program.name
    `);
        if (!canViewAllPrograms && result.recordset.length === 0) {
            throw new app_error_1.AppError('Only a program leader can view scoped program reports', 403, 'PROGRAM_REPORTS_FORBIDDEN');
        }
        return { restricted: !canViewAllPrograms, programs: result.recordset };
    }
    async getSummary(eventId, scope) {
        const pool = await (0, database_1.getSqlPool)();
        const request = pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId);
        const registrationScope = this.scopeClause(request, scope, 'registration.program_id');
        const submissionScope = this.scopeClause(request, scope, 'submission.program_id', 'submissionScopeJson');
        const result = await request.query(`
      SELECT
        (SELECT COUNT(1) FROM dbo.event_registrations registration WHERE registration.event_id = @eventId ${registrationScope}) AS totalRegistrations,
        (SELECT COUNT(1) FROM dbo.event_registrations registration WHERE registration.event_id = @eventId ${registrationScope} AND registration.status IN ('registered', 'confirmed', 'checked_in')) AS confirmedRegistrations,
        (SELECT COUNT(1) FROM dbo.payment_orders payment INNER JOIN dbo.event_registrations registration ON registration.id = payment.registration_id WHERE payment.event_id = @eventId ${registrationScope} AND payment.status = 'paid') AS paidOrders,
        (SELECT COUNT(1) FROM dbo.payment_orders payment INNER JOIN dbo.event_registrations registration ON registration.id = payment.registration_id WHERE payment.event_id = @eventId ${registrationScope} AND payment.status IN ('created', 'pending')) AS pendingOrders,
        (SELECT COUNT(1) FROM dbo.submissions submission WHERE submission.event_id = @eventId ${submissionScope} AND submission.deleted_at IS NULL) AS totalSubmissions,
        (SELECT COUNT(1) FROM dbo.submissions submission WHERE submission.event_id = @eventId ${submissionScope} AND submission.status = 'accepted') AS acceptedSubmissions,
        (SELECT COUNT(1) FROM dbo.submissions submission WHERE submission.event_id = @eventId ${submissionScope} AND submission.status = 'rejected') AS rejectedSubmissions,
        (
          SELECT COUNT(1) FROM dbo.review_assignments assignment
          INNER JOIN dbo.submissions submission ON submission.id = assignment.submission_id
          WHERE submission.event_id = @eventId ${submissionScope} AND assignment.status <> 'submitted'
        ) AS pendingReviews
    `);
        return result.recordset[0];
    }
    async getContext(eventId, scope) {
        const pool = await (0, database_1.getSqlPool)();
        const request = pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId);
        const scoped = this.scopeClause(request, scope, 'registration.program_id');
        const programCatalogScope = this.scopeClause(request, scope, 'program.id', 'catalogScopeJson');
        const result = await request.query(`
      SELECT id, name FROM dbo.event_knowledge_areas WHERE event_id = @eventId AND deleted_at IS NULL ORDER BY sort_order, name;
      SELECT id, name FROM dbo.event_knowledge_lines WHERE event_id = @eventId AND deleted_at IS NULL ORDER BY sort_order, name;
      SELECT id, name FROM dbo.event_registration_types WHERE event_id = @eventId ORDER BY sort_order, name;
      SELECT DISTINCT profile.institution AS id, profile.institution AS name
        FROM dbo.event_registrations registration INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
        WHERE registration.event_id = @eventId ${scoped} AND NULLIF(LTRIM(RTRIM(profile.institution)), '') IS NOT NULL ORDER BY name;
      SELECT DISTINCT profile.country AS id, profile.country AS name
        FROM dbo.event_registrations registration INNER JOIN dbo.participant_profiles profile ON profile.id = registration.participant_profile_id
        WHERE registration.event_id = @eventId ${scoped} AND NULLIF(LTRIM(RTRIM(profile.country)), '') IS NOT NULL ORDER BY name;
      SELECT DISTINCT submission_type.id, submission_type.name
        FROM dbo.submission_types submission_type
        INNER JOIN dbo.event_programs program ON program.id = submission_type.program_id
        WHERE program.event_id = @eventId AND program.deleted_at IS NULL ${programCatalogScope} ORDER BY submission_type.name;
    `);
        const recordsets = result.recordsets;
        const [areas = [], lines = [], registrationTypes = [], institutions = [], countries = [], submissionTypes = []] = recordsets;
        return {
            scope,
            options: { programs: scope.programs, areas, lines, registrationTypes, institutions, countries, submissionTypes },
        };
    }
    async runDynamicReport(eventId, scope, config, includeDetails) {
        const pool = await (0, database_1.getSqlPool)();
        const createRequest = () => {
            const request = pool.request().input('eventId', mssql_1.default.UniqueIdentifier, eventId);
            const where = ['registration.event_id = @eventId'];
            const scopeSql = this.scopeClause(request, scope, 'registration.program_id');
            if (scopeSql)
                where.push(scopeSql.replace(/^\s*AND\s+/, ''));
            Object.entries(config.filters).forEach(([dimension, values], index) => {
                if (!values?.length)
                    return;
                const definition = dimensionSql[dimension];
                request.input(`filter${index}Json`, mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(values));
                where.push(`${definition.key} IN (SELECT value FROM OPENJSON(@filter${index}Json))`);
            });
            return { request, where };
        };
        const selections = config.groupBy.flatMap((dimension, index) => {
            const definition = dimensionSql[dimension];
            return [`${definition.key} AS group${index}Key`, `${definition.label} AS group${index}Label`];
        });
        const groups = config.groupBy.flatMap((dimension) => {
            const definition = dimensionSql[dimension];
            return [definition.key, definition.label];
        });
        const groupRequest = createRequest();
        const grouped = await groupRequest.request.query(`
      SELECT ${selections.join(', ')},
        COUNT(DISTINCT registration.id) AS registrations,
        COUNT(DISTINCT profile.id) AS participants,
        COUNT(DISTINCT submission.id) AS submissions
      ${reportFromSql}
      WHERE ${groupRequest.where.join(' AND ')}
      GROUP BY ${groups.join(', ')}
      ORDER BY registrations DESC, ${groups.join(', ')}
    `);
        let details = [];
        if (includeDetails) {
            const detailRequest = createRequest();
            const detailResult = await detailRequest.request.query(`
        SELECT TOP 500 registration.id AS registrationId,
          CONCAT(profile.first_name, ' ', profile.last_name) AS participant,
          profile.email, profile.phone, profile.institution, profile.country,
          COALESCE(program.name, 'Sin programa') AS program,
          COALESCE(area.name, 'Sin área') AS knowledgeArea,
          COALESCE(knowledge_line.name, 'Sin línea') AS knowledgeLine,
          registration_type.name AS registrationType,
          registration.participation_mode AS participationMode,
          registration.status AS registrationStatus,
          submission.title AS submissionTitle,
          submission_type.name AS submissionType,
          submission.status AS submissionStatus,
          registration.created_at AS registeredAt
        ${reportFromSql}
        WHERE ${detailRequest.where.join(' AND ')}
        ORDER BY profile.last_name, profile.first_name, submission.title
      `);
            details = detailResult.recordset;
        }
        return { groupBy: config.groupBy, groups: grouped.recordset, details, detailLimit: 500 };
    }
    async listDefinitions(eventId, ownerUserId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, ownerUserId)
            .query(`
        SELECT id, name, config_json AS configJson, created_at AS createdAt, updated_at AS updatedAt
        FROM dbo.event_report_definitions
        WHERE event_id = @eventId AND owner_user_id = @ownerUserId
        ORDER BY updated_at DESC, name
      `);
        return result.recordset.map((row) => ({
            ...row,
            config: JSON.parse(String(row.configJson || '{}')),
            configJson: undefined,
        }));
    }
    async createDefinition(eventId, ownerUserId, name, config) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, ownerUserId)
            .input('name', mssql_1.default.NVarChar(160), name)
            .input('configJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(config))
            .query(`
        INSERT INTO dbo.event_report_definitions (event_id, owner_user_id, name, config_json)
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.created_at AS createdAt, INSERTED.updated_at AS updatedAt
        VALUES (@eventId, @ownerUserId, @name, @configJson)
      `);
        return { ...result.recordset[0], config };
    }
    async updateDefinition(eventId, ownerUserId, definitionId, name, config) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, ownerUserId)
            .input('definitionId', mssql_1.default.UniqueIdentifier, definitionId)
            .input('name', mssql_1.default.NVarChar(160), name)
            .input('configJson', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(config))
            .query(`
        UPDATE dbo.event_report_definitions
        SET name = @name, config_json = @configJson, updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.id, INSERTED.name, INSERTED.updated_at AS updatedAt
        WHERE id = @definitionId AND event_id = @eventId AND owner_user_id = @ownerUserId
      `);
        return result.recordset[0] ? { ...result.recordset[0], config } : null;
    }
    async deleteDefinition(eventId, ownerUserId, definitionId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('ownerUserId', mssql_1.default.UniqueIdentifier, ownerUserId)
            .input('definitionId', mssql_1.default.UniqueIdentifier, definitionId)
            .query(`
        DELETE FROM dbo.event_report_definitions
        OUTPUT DELETED.id
        WHERE id = @definitionId AND event_id = @eventId AND owner_user_id = @ownerUserId
      `);
        return Boolean(result.recordset[0]);
    }
    scopeClause(request, scope, column, parameter = 'programScopeJson') {
        if (!scope.restricted)
            return '';
        request.input(parameter, mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(scope.programs.map((program) => program.id)));
        return ` AND ${column} IN (SELECT TRY_CONVERT(uniqueidentifier, value) FROM OPENJSON(@${parameter}))`;
    }
}
exports.ReportsRepository = ReportsRepository;
//# sourceMappingURL=reports.repository.js.map