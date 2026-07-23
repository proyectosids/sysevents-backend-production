"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submissionTypesRouter = exports.mySubmissionsRouter = exports.submissionsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const email_service_1 = require("../../communications/application/services/email.service");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const file_storage_service_1 = require("../../files/application/services/file-storage.service");
const files_repository_1 = require("../../files/infrastructure/repositories/files.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const submissions_repository_1 = require("../infrastructure/repositories/submissions.repository");
const submission_schemas_1 = require("./schemas/submission.schemas");
exports.submissionsRouter = (0, express_1.Router)();
exports.mySubmissionsRouter = (0, express_1.Router)();
exports.submissionTypesRouter = (0, express_1.Router)();
const submissionsRepository = new submissions_repository_1.SubmissionsRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const emailService = new email_service_1.EmailService();
const filesRepository = new files_repository_1.FilesRepository();
const fileStorageService = new file_storage_service_1.FileStorageService();
exports.submissionTypesRouter.post('/:eventId/submission-types', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('submissions.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = submission_schemas_1.submissionEventParamsSchema.parse(req.params);
    const input = submission_schemas_1.createSubmissionTypeSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event)
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    const type = await submissionsRepository.createSubmissionType(eventId, input);
    return (0, api_response_1.sendSuccess)(res, 'Submission type created successfully', type, 201);
}));
exports.submissionTypesRouter.get('/:eventId/submission-types', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = submission_schemas_1.submissionEventParamsSchema.parse(req.params);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || (event.status !== 'published' && !req.user.permissions.includes('submissions.manage')))
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    const programId = typeof req.query.programId === 'string' ? req.query.programId : null;
    const types = await submissionsRepository.listSubmissionTypes(eventId, programId);
    return (0, api_response_1.sendSuccess)(res, 'Submission types retrieved successfully', types);
}));
exports.submissionTypesRouter.delete('/:eventId/submission-types/:typeId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('submissions.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, typeId } = submission_schemas_1.submissionTypeParamsSchema.parse(req.params);
    const deleted = await submissionsRepository.deactivateSubmissionType(eventId, typeId);
    if (!deleted)
        throw new app_error_1.AppError('Submission type not found', 404, 'SUBMISSION_TYPE_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Submission type deleted successfully');
}));
exports.submissionTypesRouter.post('/:eventId/submissions', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = submission_schemas_1.submissionEventParamsSchema.parse(req.params);
    const input = submission_schemas_1.createSubmissionSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || event.status !== 'published')
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    const submission = await submissionsRepository.createSubmission({
        ...input,
        eventId,
        ownerUserId: req.user.id,
    });
    return (0, api_response_1.sendSuccess)(res, 'Submission created successfully', submission, 201);
}));
exports.submissionTypesRouter.get('/:eventId/submissions', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('submissions.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = submission_schemas_1.submissionEventParamsSchema.parse(req.params);
    const submissions = await submissionsRepository.listByEvent(eventId, {
        programId: typeof req.query.programId === 'string' ? req.query.programId : null,
        submissionTypeId: typeof req.query.submissionTypeId === 'string' ? req.query.submissionTypeId : null,
        status: typeof req.query.status === 'string' ? req.query.status : null,
        leaderUserId: req.user.permissions.includes('submissions.manage') ? null : req.user.id,
    });
    return (0, api_response_1.sendSuccess)(res, 'Event submissions retrieved successfully', submissions);
}));
exports.mySubmissionsRouter.get('/submissions', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const submissions = await submissionsRepository.listMine(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'My submissions retrieved successfully', submissions);
}));
exports.submissionsRouter.get('/:id', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (submission.ownerUserId !== req.user.id && !req.user.permissions.includes('submissions.read')) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    return (0, api_response_1.sendSuccess)(res, 'Submission retrieved successfully', submission);
}));
exports.submissionsRouter.get('/:id/files', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (submission.ownerUserId !== req.user.id && !req.user.permissions.includes('submissions.read')) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    return (0, api_response_1.sendSuccess)(res, 'Submission files retrieved successfully', await submissionsRepository.listFiles(id));
}));
exports.submissionsRouter.get('/:id/files/:fileId/content', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const fileId = String(req.params.fileId ?? '');
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (submission.ownerUserId !== req.user.id && !req.user.permissions.includes('submissions.read')) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    const belongs = (await submissionsRepository.listFiles(id)).some((file) => file.id === fileId);
    if (!belongs)
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    const file = await filesRepository.findById(fileId);
    if (!file)
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    return res.sendFile(fileStorageService.getAbsolutePath(file.storagePath));
}));
exports.submissionsRouter.patch('/:id', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const current = await submissionsRepository.findById(id);
    if (!current)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (current.ownerUserId !== req.user.id && !req.user.permissions.includes('submissions.manage')) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    const input = submission_schemas_1.updateSubmissionSchema.parse(req.body);
    const submission = await submissionsRepository.updateSubmission(id, input);
    if (!submission)
        throw new app_error_1.AppError('Submission cannot be updated in its current status', 409, 'SUBMISSION_INVALID_STATUS');
    return (0, api_response_1.sendSuccess)(res, 'Submission updated successfully', submission);
}));
exports.submissionsRouter.delete('/:id', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const deleted = await submissionsRepository.deleteDraft(id, req.user.id);
    if (!deleted)
        throw new app_error_1.AppError('Only an unsubmitted draft can be deleted', 409, 'SUBMISSION_DELETE_NOT_ALLOWED');
    return (0, api_response_1.sendSuccess)(res, 'Submission draft deleted successfully');
}));
exports.submissionsRouter.post('/:id/files', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const input = submission_schemas_1.attachSubmissionFileSchema.parse(req.body);
    const submission = await submissionsRepository.findById(id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    if (submission.ownerUserId !== req.user.id && !req.user.permissions.includes('submissions.manage')) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    await submissionsRepository.attachFile(id, input.fileId, input.fileRole, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'File attached to submission successfully');
}));
exports.submissionsRouter.post('/:id/submit', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const submission = await submissionsRepository.submit(id, req.user.id);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    await emailService.sendTemplate('submission_received', req.user.email, {
        submissionTitle: submission.title,
        eventName: 'event',
    });
    return (0, api_response_1.sendSuccess)(res, 'Submission submitted successfully', submission);
}));
exports.submissionsRouter.post('/:id/resubmit', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = submission_schemas_1.submissionIdParamsSchema.parse(req.params);
    const submission = await submissionsRepository.submit(id, req.user.id, true);
    if (!submission)
        throw new app_error_1.AppError('Submission not found', 404, 'SUBMISSION_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Submission resubmitted successfully', submission);
}));
//# sourceMappingURL=submissions.routes.js.map