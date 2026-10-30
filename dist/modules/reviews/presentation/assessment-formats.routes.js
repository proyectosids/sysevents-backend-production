"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessmentFormatsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const api_response_1 = require("../../../shared/utils/api-response");
const async_handler_1 = require("../../../shared/utils/async-handler");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const email_service_1 = require("../../communications/application/services/email.service");
const communications_repository_1 = require("../../communications/infrastructure/repositories/communications.repository");
const academic_workflow_repository_1 = require("../infrastructure/repositories/academic-workflow.repository");
const assessment_formats_repository_1 = require("../infrastructure/repositories/assessment-formats.repository");
const academic_scope_policy_1 = require("../domain/academic-scope-policy");
const assessment_schemas_1 = require("./schemas/assessment.schemas");
exports.assessmentFormatsRouter = (0, express_1.Router)();
const repository = new assessment_formats_repository_1.AssessmentFormatsRepository();
const workflowRepository = new academic_workflow_repository_1.AcademicWorkflowRepository();
const emailService = new email_service_1.EmailService();
const communicationsRepository = new communications_repository_1.CommunicationsRepository();
const userScopes = async (userId) => workflowRepository.listMyScopes(userId);
const canManageAllFormats = (permissions) => permissions.includes('submissions.manage');
const canReadAllFormats = (permissions) => permissions.includes('submissions.read');
const requireFormatAccess = async (eventId, userId, permissions, formatScopes, write = false) => {
    if (write ? canManageAllFormats(permissions) : canReadAllFormats(permissions))
        return;
    const scopes = await userScopes(userId);
    const allowed = write
        ? (0, academic_scope_policy_1.canManageAssessmentFormat)(scopes, eventId, formatScopes)
        : (0, academic_scope_policy_1.canReadAssessmentFormat)(scopes, eventId, formatScopes);
    if (!allowed)
        throw new app_error_1.AppError('No tienes acceso a este formato y alcance académico.', 403, 'ASSESSMENT_FORMAT_FORBIDDEN');
};
exports.assessmentFormatsRouter.get('/events/:eventId/assessment-formats', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = assessment_schemas_1.assessmentEventParamsSchema.parse(req.params);
    const formats = await repository.list(eventId);
    if (canReadAllFormats(req.user.permissions))
        return (0, api_response_1.sendSuccess)(res, 'Formatos recuperados.', formats);
    const scopes = await userScopes(req.user.id);
    const visible = formats.filter((format) => (0, academic_scope_policy_1.canManageAssessmentFormat)(scopes, eventId, format.scopes ?? []));
    if (!scopes.some((scope) => scope.eventId === eventId))
        throw new app_error_1.AppError('No tienes acceso a los formatos de este evento.', 403, 'ASSESSMENT_FORMAT_FORBIDDEN');
    return (0, api_response_1.sendSuccess)(res, 'Formatos recuperados.', visible);
}));
exports.assessmentFormatsRouter.post('/events/:eventId/assessment-formats', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = assessment_schemas_1.assessmentEventParamsSchema.parse(req.params);
    const input = assessment_schemas_1.createAssessmentFormatSchema.parse(req.body);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, input.scopes, true);
    return (0, api_response_1.sendSuccess)(res, 'Formato creado.', await repository.create({ eventId, ...input, definition: input.definition, userId: req.user.id }), 201);
}));
exports.assessmentFormatsRouter.patch('/events/:eventId/assessment-formats/:formatId', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formatId } = assessment_schemas_1.assessmentFormatParamsSchema.parse(req.params);
    const input = assessment_schemas_1.updateAssessmentFormatSchema.parse(req.body);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, await repository.scopes(eventId, formatId), true);
    if (input.scopes)
        await requireFormatAccess(eventId, req.user.id, req.user.permissions, input.scopes, true);
    return (0, api_response_1.sendSuccess)(res, 'Borrador guardado.', await repository.updateDraft({ eventId, formatId, ...input, definition: input.definition, userId: req.user.id }));
}));
exports.assessmentFormatsRouter.get('/events/:eventId/assessment-formats/:formatId/versions', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formatId } = assessment_schemas_1.assessmentFormatParamsSchema.parse(req.params);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, await repository.scopes(eventId, formatId));
    return (0, api_response_1.sendSuccess)(res, 'Versiones recuperadas.', await repository.versions(eventId, formatId));
}));
exports.assessmentFormatsRouter.post('/events/:eventId/assessment-formats/:formatId/versions/:versionId/publish', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formatId, versionId } = assessment_schemas_1.assessmentVersionParamsSchema.parse(req.params);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, await repository.scopes(eventId, formatId), true);
    return (0, api_response_1.sendSuccess)(res, 'Versión publicada.', await repository.publish(eventId, formatId, versionId, req.user.id));
}));
exports.assessmentFormatsRouter.post('/events/:eventId/assessment-formats/:formatId/duplicate', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formatId } = assessment_schemas_1.assessmentFormatParamsSchema.parse(req.params);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, await repository.scopes(eventId, formatId), true);
    return (0, api_response_1.sendSuccess)(res, 'Formato duplicado.', await repository.duplicate(eventId, formatId, req.user.id), 201);
}));
exports.assessmentFormatsRouter.post('/events/:eventId/assessment-formats/:formatId/archive', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formatId } = assessment_schemas_1.assessmentFormatParamsSchema.parse(req.params);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, await repository.scopes(eventId, formatId), true);
    if (!await repository.archive(eventId, formatId))
        throw new app_error_1.AppError('Formato no encontrado.', 404, 'ASSESSMENT_FORMAT_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Formato archivado.');
}));
exports.assessmentFormatsRouter.delete('/events/:eventId/assessment-formats/:formatId', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formatId } = assessment_schemas_1.assessmentFormatParamsSchema.parse(req.params);
    await requireFormatAccess(eventId, req.user.id, req.user.permissions, await repository.scopes(eventId, formatId), true);
    await repository.remove(eventId, formatId);
    return (0, api_response_1.sendSuccess)(res, 'Formato eliminado.');
}));
exports.assessmentFormatsRouter.post('/events/:eventId/assessment-formats/preview', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = assessment_schemas_1.assessmentEventParamsSchema.parse(req.params);
    const input = assessment_schemas_1.assessmentPreviewSchema.parse(req.body);
    const scopes = await userScopes(req.user.id);
    if (!canReadAllFormats(req.user.permissions) && !scopes.some((scope) => scope.eventId === eventId))
        throw new app_error_1.AppError('No tienes acceso a los formatos de este evento.', 403, 'ASSESSMENT_FORMAT_FORBIDDEN');
    const { evaluateAssessment } = await Promise.resolve().then(() => __importStar(require('../domain/assessment-engine')));
    return (0, api_response_1.sendSuccess)(res, 'Vista previa calculada.', evaluateAssessment(input.definition, input.answers, input.comments));
}));
exports.assessmentFormatsRouter.get('/events/:eventId/assessment-formats-eligible', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = assessment_schemas_1.assessmentEventParamsSchema.parse(req.params);
    const purpose = req.query.purpose === 'evaluation' ? 'evaluation' : 'review';
    const programId = typeof req.query.programId === 'string' ? req.query.programId : null;
    if (!canReadAllFormats(req.user.permissions) && !(0, academic_scope_policy_1.canReadProgram)(await userScopes(req.user.id), eventId, programId))
        throw new app_error_1.AppError('No tienes acceso a los formatos de este programa.', 403, 'ASSESSMENT_FORMAT_FORBIDDEN');
    return (0, api_response_1.sendSuccess)(res, 'Formatos elegibles recuperados.', await repository.eligibleVersions(eventId, purpose, programId, typeof req.query.submissionTypeId === 'string' ? req.query.submissionTypeId : null));
}));
exports.assessmentFormatsRouter.get('/assessments/:kind/:assignmentId', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { kind, assignmentId } = assessment_schemas_1.assessmentAssignmentParamsSchema.parse(req.params);
    const workspace = await repository.workspace(kind, assignmentId, req.user.id);
    if (!workspace)
        throw new app_error_1.AppError('Asignación no encontrada.', 404, 'ASSESSMENT_ASSIGNMENT_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Formato de asignación recuperado.', workspace);
}));
const saveResponse = (submit) => (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { kind, assignmentId } = assessment_schemas_1.assessmentAssignmentParamsSchema.parse(req.params);
    const input = assessment_schemas_1.assessmentResponseSchema.parse(req.body);
    const result = await repository.saveResponse({ kind, assignmentId, userId: req.user.id, ...input, submit });
    if (kind === 'review' && submit) {
        const notification = await workflowRepository.assignmentNotificationData(assignmentId);
        if (notification?.leaderEmail) {
            await communicationsRepository.createNotification({ userId: notification.leaderUserId, recipientEmail: notification.leaderEmail, type: 'review_completed', title: 'Revisión lista para verificar', message: `La revisión de ${notification.submissionTitle} fue enviada para tu verificación.` });
            await emailService.sendTemplate('review_completed', notification.leaderEmail, { submissionTitle: notification.submissionTitle });
        }
    }
    return (0, api_response_1.sendSuccess)(res, submit ? 'Evaluación enviada.' : 'Borrador guardado.', result);
});
exports.assessmentFormatsRouter.put('/assessments/:kind/:assignmentId/draft', authenticate_middleware_1.authenticateMiddleware, saveResponse(false));
exports.assessmentFormatsRouter.post('/assessments/:kind/:assignmentId/submit', authenticate_middleware_1.authenticateMiddleware, saveResponse(true));
//# sourceMappingURL=assessment-formats.routes.js.map