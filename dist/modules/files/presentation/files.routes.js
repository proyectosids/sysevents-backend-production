"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicFilesRouter = exports.filesRouter = void 0;
const path_1 = __importDefault(require("path"));
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const submissions_repository_1 = require("../../submissions/infrastructure/repositories/submissions.repository");
const file_storage_service_1 = require("../application/services/file-storage.service");
const files_repository_1 = require("../infrastructure/repositories/files.repository");
const file_schemas_1 = require("./schemas/file.schemas");
exports.filesRouter = (0, express_1.Router)();
exports.publicFilesRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: env_1.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
        files: 30,
    },
});
const filesRepository = new files_repository_1.FilesRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const storageService = new file_storage_service_1.FileStorageService();
const submissionsRepository = new submissions_repository_1.SubmissionsRepository();
async function persistUploadedFile(uploadedFile, input, ownerUserId) {
    const categoryId = await filesRepository.findOrCreateCategoryIdByName(input.category);
    const stored = await storageService.save(uploadedFile, {
        category: input.category,
        eventId: input.eventId,
    });
    try {
        return await filesRepository.createFile({
            categoryId,
            tenantId: input.tenantId,
            eventId: input.eventId,
            ownerUserId,
            originalName: stored.originalName,
            storedName: stored.storedName,
            storagePath: stored.storagePath,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            checksumSha256: stored.checksumSha256,
        });
    }
    catch (error) {
        await storageService.remove(stored.storagePath);
        throw error;
    }
}
function safeFileRecord(file) {
    const { storagePath: _storagePath, ...safeFile } = file;
    return safeFile;
}
function sendMissingImageFallback(res) {
    res
        .status(200)
        .type('image/svg+xml')
        .send(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img" aria-label="Archivo no disponible">
        <rect width="1200" height="720" fill="#f1f5f9"/>
        <rect x="410" y="218" width="380" height="284" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
        <path d="M500 430l72-84 58 66 38-42 62 60H500z" fill="#94a3b8"/>
        <circle cx="698" cy="304" r="32" fill="#cbd5e1"/>
        <text x="600" y="552" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#475569">Archivo no disponible</text>
      </svg>
    `);
}
exports.filesRouter.use(authenticate_middleware_1.authenticateMiddleware);
exports.filesRouter.post('/submission-upload', upload.single('file'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.file)
        throw new app_error_1.AppError('File is required', 400, 'FILE_REQUIRED');
    const submissionId = typeof req.body.submissionId === 'string' ? req.body.submissionId : '';
    const fileRole = typeof req.body.fileRole === 'string' ? req.body.fileRole : 'manuscript';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionId)) {
        throw new app_error_1.AppError('Invalid submission id', 400, 'INVALID_SUBMISSION_ID');
    }
    if (!['manuscript', 'abstract', 'corrected_manuscript'].includes(fileRole)) {
        throw new app_error_1.AppError('Invalid submission file role', 400, 'INVALID_FILE_ROLE');
    }
    const submission = await submissionsRepository.findById(submissionId);
    if (!submission || submission.ownerUserId !== req.user.id) {
        throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
    }
    const acceptedCorrection = submission.status === 'accepted'
        && submission.latestDecision === 'accepted_with_observations'
        && fileRole === 'corrected_manuscript';
    if (!['draft', 'changes_requested'].includes(submission.status) && !acceptedCorrection) {
        throw new app_error_1.AppError('Submission cannot receive files in its current status', 409, 'SUBMISSION_INVALID_STATUS');
    }
    const file = await persistUploadedFile(req.file, {
        category: 'submission_document',
        eventId: submission.eventId,
        tenantId: undefined,
    }, req.user.id);
    try {
        await submissionsRepository.attachFile(submissionId, file.id, fileRole, req.user.id);
        return (0, api_response_1.sendSuccess)(res, 'Submission file uploaded successfully', safeFileRecord(file), 201);
    }
    catch (error) {
        await storageService.remove(file.storagePath);
        await filesRepository.softDelete(file.id);
        throw error;
    }
}));
exports.filesRouter.get('/', (0, require_permission_middleware_1.requirePermission)('files.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const query = file_schemas_1.listFilesQuerySchema.parse(req.query);
    const files = await filesRepository.listFiles(query);
    const safeFiles = files.map(({ storagePath: _storagePath, ...file }) => file);
    return (0, api_response_1.sendSuccess)(res, 'Files retrieved successfully', safeFiles);
}));
exports.filesRouter.post('/upload', (0, require_permission_middleware_1.requirePermission)('files.upload'), upload.single('file'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new app_error_1.AppError('File is required', 400, 'FILE_REQUIRED');
    }
    const input = file_schemas_1.uploadFileSchema.parse(req.body);
    const file = await persistUploadedFile(req.file, input, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'File uploaded successfully', safeFileRecord(file), 201);
}));
exports.filesRouter.post('/upload-many', (0, require_permission_middleware_1.requirePermission)('files.upload'), upload.array('files', 30), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const uploadedFiles = req.files;
    if (!uploadedFiles?.length) {
        throw new app_error_1.AppError('At least one file is required', 400, 'FILES_REQUIRED');
    }
    const input = file_schemas_1.uploadFileSchema.parse(req.body);
    const created = [];
    for (const uploadedFile of uploadedFiles) {
        created.push(await persistUploadedFile(uploadedFile, input, req.user.id));
    }
    return (0, api_response_1.sendSuccess)(res, 'Files uploaded successfully', created.map(safeFileRecord), 201);
}));
exports.filesRouter.get('/materials/:id/download', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = file_schemas_1.fileIdParamsSchema.parse(req.params);
    const file = await filesRepository.findById(id);
    if (!file) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    const canDownload = req.user.permissions.includes('files.read')
        || await filesRepository.canUserDownloadEventMaterial(file.id, req.user.id);
    if (!canDownload) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    return res.download(storageService.getAbsolutePath(file.storagePath), path_1.default.basename(file.originalName));
}));
exports.filesRouter.get('/:id', (0, require_permission_middleware_1.requirePermission)('files.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = file_schemas_1.fileIdParamsSchema.parse(req.params);
    const file = await filesRepository.findById(id);
    if (!file) {
        return sendMissingImageFallback(res);
    }
    const { storagePath: _storagePath, ...safeFile } = file;
    return (0, api_response_1.sendSuccess)(res, 'File retrieved successfully', safeFile);
}));
exports.filesRouter.get('/:id/download', (0, require_permission_middleware_1.requirePermission)('files.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = file_schemas_1.fileIdParamsSchema.parse(req.params);
    const file = await filesRepository.findById(id);
    if (!file) {
        return sendMissingImageFallback(res);
    }
    return res.download(storageService.getAbsolutePath(file.storagePath), path_1.default.basename(file.originalName));
}));
exports.filesRouter.delete('/:id', (0, require_permission_middleware_1.requirePermission)('files.delete'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = file_schemas_1.fileIdParamsSchema.parse(req.params);
    const existing = await filesRepository.findById(id);
    if (!existing) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    await storageService.remove(existing.storagePath);
    const file = await filesRepository.softDelete(id);
    if (!file) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'File deleted successfully');
}));
exports.publicFilesRouter.get('/:id/download', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = file_schemas_1.fileIdParamsSchema.parse(req.params);
    const file = await filesRepository.findById(id);
    if (!file) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    const isImage = file.mimeType.startsWith('image/');
    const isPublicMaterial = !isImage ? await filesRepository.isPublicMaterial(file.id) : false;
    if (!isImage && !isPublicMaterial) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    if (file.eventId) {
        const event = await eventsRepository.findEventById(file.eventId);
        if (!event) {
            throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
        }
    }
    else if (!isImage) {
        throw new app_error_1.AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
    if (isImage && req.query.variant === 'sponsor-logo') {
        const logo = await storageService.createSponsorLogoVariant(file.storagePath);
        return res
            .set('Cache-Control', 'public, max-age=31536000, immutable')
            .type('image/webp')
            .send(logo);
    }
    if (isImage && req.query.variant === 'speaker-photo') {
        const photo = await storageService.createSpeakerPhotoVariant(file.storagePath);
        return res
            .set('Cache-Control', 'public, max-age=31536000, immutable')
            .type('image/webp')
            .send(photo);
    }
    return res.sendFile(storageService.getAbsolutePath(file.storagePath), (error) => {
        if (!error)
            return;
        if (file.mimeType.startsWith('image/')) {
            return sendMissingImageFallback(res);
        }
        if (!res.headersSent) {
            return res.status(404).end();
        }
    });
}));
//# sourceMappingURL=files.routes.js.map