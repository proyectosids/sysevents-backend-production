"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.myEvaluationsRouter = exports.evaluationsRouter = void 0;
const crypto_1 = __importDefault(require("crypto"));
const path_1 = __importDefault(require("path"));
const express_1 = require("express");
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../shared/errors/app-error");
const api_response_1 = require("../../../shared/utils/api-response");
const async_handler_1 = require("../../../shared/utils/async-handler");
const email_service_1 = require("../../communications/application/services/email.service");
const iam_repository_1 = require("../../iam/infrastructure/repositories/iam.repository");
const files_repository_1 = require("../../files/infrastructure/repositories/files.repository");
const file_storage_service_1 = require("../../files/application/services/file-storage.service");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const submissions_repository_1 = require("../../submissions/infrastructure/repositories/submissions.repository");
const academic_workflow_repository_1 = require("../infrastructure/repositories/academic-workflow.repository");
const evaluations_repository_1 = require("../infrastructure/repositories/evaluations.repository");
const evaluation_schemas_1 = require("./schemas/evaluation.schemas");
const review_schemas_1 = require("./schemas/review.schemas");
exports.evaluationsRouter = (0, express_1.Router)();
exports.myEvaluationsRouter = (0, express_1.Router)();
const evaluationsRepository = new evaluations_repository_1.EvaluationsRepository();
const academicWorkflowRepository = new academic_workflow_repository_1.AcademicWorkflowRepository();
const submissionsRepository = new submissions_repository_1.SubmissionsRepository();
const iamRepository = new iam_repository_1.IamRepository();
const emailService = new email_service_1.EmailService();
const filesRepository = new files_repository_1.FilesRepository();
const fileStorageService = new file_storage_service_1.FileStorageService();
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
exports.evaluationsRouter.post('/events/:eventId/evaluator-invitations', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = review_schemas_1.reviewTeamEventParamsSchema.parse(req.params);
    const input = evaluation_schemas_1.evaluatorInvitationSchema.parse(req.body);
    const canInvite = req.user.permissions.includes('submissions.manage')
        || await academicWorkflowRepository.isSupervisor(eventId, input.programId ?? null, req.user.id);
    if (!canInvite)
        throw new app_error_1.AppError('Sólo el supervisor del alcance puede invitar evaluadores.', 403, 'SUPERVISOR_REQUIRED');
    const token = crypto_1.default.randomBytes(48).toString('hex');
    const invitation = await evaluationsRepository.createInvitation({
        eventId,
        programId: input.programId,
        email: input.email,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        invitedBy: req.user.id,
    });
    const invitationUrl = `${env_1.env.APP_PUBLIC_URL.replace(/\/$/, '')}/accept-evaluator-invitation?token=${encodeURIComponent(token)}`;
    await emailService.sendTemplate('evaluator_invitation', input.email, {
        eventName: invitation.event_name,
        invitationUrl,
    });
    return (0, api_response_1.sendSuccess)(res, 'Evaluator invitation created successfully', {
        id: invitation.id,
        expiresInHours: 48,
        invitationUrl: env_1.env.NODE_ENV === 'production' ? undefined : invitationUrl,
    }, 201);
}));
exports.evaluationsRouter.get('/events/:eventId/evaluator-assignments', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = review_schemas_1.reviewTeamEventParamsSchema.parse(req.params);
    const unrestricted = req.user.permissions.includes('submissions.manage');
    if (!unrestricted && !(await academicWorkflowRepository.listMyScopes(req.user.id)).some((scope) => scope.eventId === eventId && scope.role === 'supervisor')) {
        throw new app_error_1.AppError('Sólo el supervisor puede consultar estas asignaciones.', 403, 'SUPERVISOR_REQUIRED');
    }
    return (0, api_response_1.sendSuccess)(res, 'Evaluator assignments retrieved successfully', await evaluationsRepository.listEventAssignments(eventId, req.user.id, unrestricted));
}));
exports.evaluationsRouter.post('/events/:eventId/evaluator-assignments/bulk', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = review_schemas_1.reviewTeamEventParamsSchema.parse(req.params);
    const input = evaluation_schemas_1.bulkEvaluatorAssignmentSchema.parse(req.body);
    const unrestricted = req.user.permissions.includes('submissions.manage');
    if (!unrestricted && !(await academicWorkflowRepository.listMyScopes(req.user.id)).some((scope) => scope.eventId === eventId && scope.role === 'supervisor')) {
        throw new app_error_1.AppError('Sólo el supervisor puede asignar evaluaciones.', 403, 'SUPERVISOR_REQUIRED');
    }
    const assignments = await evaluationsRepository.assignMany({ ...input, eventId, assignedBy: req.user.id, supervisorUserId: req.user.id, unrestricted });
    return (0, api_response_1.sendSuccess)(res, 'Evaluator assignments created successfully', assignments, 201);
}));
exports.evaluationsRouter.get('/events/:eventId/evaluator-invitations', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = review_schemas_1.reviewTeamEventParamsSchema.parse(req.params);
    const unrestricted = req.user.permissions.includes('submissions.manage');
    if (!unrestricted && !(await academicWorkflowRepository.listMyScopes(req.user.id)).some((scope) => scope.eventId === eventId && scope.role === 'supervisor')) {
        throw new app_error_1.AppError('Sólo el supervisor puede consultar estas invitaciones.', 403, 'SUPERVISOR_REQUIRED');
    }
    return (0, api_response_1.sendSuccess)(res, 'Evaluator invitations retrieved successfully', await evaluationsRepository.listInvitations(eventId, req.user.id, unrestricted));
}));
exports.evaluationsRouter.delete('/events/:eventId/evaluator-invitations/:invitationId', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, invitationId } = evaluation_schemas_1.evaluatorInvitationParamsSchema.parse(req.params);
    const invitation = await evaluationsRepository.findInvitation(invitationId, eventId);
    if (!invitation)
        throw new app_error_1.AppError('Invitation not found', 404, 'EVALUATOR_INVITATION_NOT_FOUND');
    const canRevoke = req.user.permissions.includes('submissions.manage')
        || await academicWorkflowRepository.isSupervisor(eventId, invitation.program_id, req.user.id);
    if (!canRevoke)
        throw new app_error_1.AppError('Sólo el supervisor del alcance puede revocar esta invitación.', 403, 'SUPERVISOR_REQUIRED');
    if (!await evaluationsRepository.revokeInvitation(invitationId, eventId)) {
        throw new app_error_1.AppError('La invitación ya fue aceptada o revocada.', 409, 'EVALUATOR_INVITATION_NOT_REVOCABLE');
    }
    return (0, api_response_1.sendSuccess)(res, 'Evaluator invitation revoked successfully');
}));
exports.evaluationsRouter.post('/evaluator-invitations/accept', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = evaluation_schemas_1.acceptEvaluatorInvitationSchema.parse(req.body);
    const accepted = await evaluationsRepository.acceptInvitation(hashToken(input.token), req.user.id, req.user.email);
    return (0, api_response_1.sendSuccess)(res, 'Evaluator invitation accepted successfully', accepted);
}));
exports.evaluationsRouter.post('/events/:eventId/evaluator-assignments', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = review_schemas_1.reviewTeamEventParamsSchema.parse(req.params);
    const input = evaluation_schemas_1.evaluatorAssignmentSchema.parse(req.body);
    const submission = await submissionsRepository.findById(input.submissionId);
    if (!submission || submission.eventId !== eventId)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    const canAssign = req.user.permissions.includes('submissions.manage')
        || await academicWorkflowRepository.isSupervisorForSubmission(input.submissionId, req.user.id);
    if (!canAssign)
        throw new app_error_1.AppError('Sólo el supervisor puede asignar evaluadores.', 403, 'SUPERVISOR_REQUIRED');
    const evaluator = await iamRepository.findUserById(input.evaluatorUserId);
    if (!evaluator)
        throw new app_error_1.AppError('Evaluator not found', 404, 'EVALUATOR_NOT_FOUND');
    const assignment = await evaluationsRepository.assign({ ...input, assignedBy: req.user.id });
    return (0, api_response_1.sendSuccess)(res, 'Evaluator assignment created successfully', assignment, 201);
}));
exports.evaluationsRouter.delete('/events/:eventId/evaluators/:userId', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, userId } = evaluation_schemas_1.evaluatorScopeParamsSchema.parse(req.params);
    const { programId = null } = evaluation_schemas_1.evaluatorScopeQuerySchema.parse({
        programId: typeof req.query.programId === 'string' && req.query.programId ? req.query.programId : null,
    });
    const canRemove = req.user.permissions.includes('submissions.manage')
        || await academicWorkflowRepository.isSupervisor(eventId, programId, req.user.id);
    if (!canRemove)
        throw new app_error_1.AppError('Sólo el supervisor del alcance puede retirar evaluadores.', 403, 'SUPERVISOR_REQUIRED');
    if (!await evaluationsRepository.deactivateEvaluatorScope(eventId, programId, userId)) {
        throw new app_error_1.AppError('El evaluador no tiene un alcance activo con esos datos.', 404, 'EVALUATOR_SCOPE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Evaluator scope removed successfully');
}));
exports.myEvaluationsRouter.get('/evaluations', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    return (0, api_response_1.sendSuccess)(res, 'My evaluations retrieved successfully', await evaluationsRepository.listMine(req.user.id));
}));
exports.myEvaluationsRouter.get('/evaluation-feedback', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    return (0, api_response_1.sendSuccess)(res, 'Participant evaluation feedback retrieved successfully', await evaluationsRepository.participantFeedback(req.user.id));
}));
exports.evaluationsRouter.post('/evaluations/:id/submit', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = evaluation_schemas_1.evaluationAssignmentParamsSchema.parse(req.params);
    const input = evaluation_schemas_1.submitEvaluationSchema.parse(req.body);
    const evaluation = await evaluationsRepository.submit({
        assignmentId: id,
        evaluatorUserId: req.user.id,
        answers: input.answers,
        comments: input.comments,
    });
    return (0, api_response_1.sendSuccess)(res, 'Evaluation submitted successfully', evaluation, 201);
}));
exports.evaluationsRouter.get('/evaluations/:id/printable-form', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = evaluation_schemas_1.evaluationAssignmentParamsSchema.parse(req.params);
    const fileId = await evaluationsRepository.printableFormFile(id, req.user.id);
    if (!fileId)
        throw new app_error_1.AppError('El formato imprimible aún no está disponible.', 404, 'EVALUATION_PRINTABLE_FORM_NOT_FOUND');
    const file = await filesRepository.findById(fileId);
    if (!file)
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    return res.download(fileStorageService.getAbsolutePath(file.storagePath), path_1.default.basename(file.originalName));
}));
//# sourceMappingURL=evaluations.routes.js.map