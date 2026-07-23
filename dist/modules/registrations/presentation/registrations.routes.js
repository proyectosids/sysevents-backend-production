"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.myRegistrationsRouter = exports.registrationsRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const file_storage_service_1 = require("../../files/application/services/file-storage.service");
const files_repository_1 = require("../../files/infrastructure/repositories/files.repository");
const auth_service_1 = require("../../iam/application/services/auth.service");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const optional_authenticate_middleware_1 = require("../../iam/presentation/middlewares/optional-authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const registrations_repository_1 = require("../infrastructure/repositories/registrations.repository");
const registration_schemas_1 = require("./schemas/registration.schemas");
exports.registrationsRouter = (0, express_1.Router)();
exports.myRegistrationsRouter = (0, express_1.Router)();
const eventsRepository = new events_repository_1.EventsRepository();
const registrationsRepository = new registrations_repository_1.RegistrationsRepository();
const authService = new auth_service_1.AuthService();
const filesRepository = new files_repository_1.FilesRepository();
const fileStorageService = new file_storage_service_1.FileStorageService();
const registrationFileUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: env_1.env.MAX_UPLOAD_SIZE_MB * 1024 * 1024, files: 1 },
});
exports.registrationsRouter.post('/:eventId/registration-types', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createRegistrationTypeSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const registrationType = await registrationsRepository.createRegistrationType(eventId, input);
    return (0, api_response_1.sendSuccess)(res, 'Registration type created successfully', registrationType, 201);
}));
exports.registrationsRouter.patch('/:eventId/registration-forms/:formId/fields/:fieldId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_forms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formId, fieldId } = registration_schemas_1.registrationFormFieldParamsSchema.parse(req.params);
    const input = registration_schemas_1.updateRegistrationFormFieldSchema.parse(req.body);
    const field = await registrationsRepository.updateRegistrationFormField(eventId, formId, fieldId, input);
    if (!field) {
        throw new app_error_1.AppError('Registration form field not found', 404, 'REGISTRATION_FORM_FIELD_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration form field updated successfully', field);
}));
exports.registrationsRouter.patch('/:eventId/materials/:materialId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('event_materials.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, materialId } = registration_schemas_1.eventMaterialParamsSchema.parse(req.params);
    const input = registration_schemas_1.updateEventMaterialSchema.parse(req.body);
    const material = await registrationsRepository.updateEventMaterial(eventId, materialId, input);
    if (!material) {
        throw new app_error_1.AppError('Event material not found', 404, 'EVENT_MATERIAL_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event material updated successfully', material);
}));
exports.registrationsRouter.delete('/:eventId/registration-forms/:formId/fields/:fieldId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_forms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, formId, fieldId } = registration_schemas_1.registrationFormFieldParamsSchema.parse(req.params);
    const removed = await registrationsRepository.deleteRegistrationFormField(eventId, formId, fieldId);
    if (!removed) {
        throw new app_error_1.AppError('Registration form field not found', 404, 'REGISTRATION_FORM_FIELD_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration form field deleted successfully');
}));
exports.registrationsRouter.post('/:eventId/registration-addons', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_addons.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createRegistrationAddonSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    if (input.registrationTypeId) {
        const registrationType = await registrationsRepository.findRegistrationType(eventId, input.registrationTypeId);
        if (!registrationType) {
            throw new app_error_1.AppError('Registration type not found', 404, 'REGISTRATION_TYPE_NOT_FOUND');
        }
    }
    const addon = await registrationsRepository.createRegistrationAddon(eventId, input);
    return (0, api_response_1.sendSuccess)(res, 'Registration add-on created successfully', addon, 201);
}));
exports.registrationsRouter.patch('/:eventId/registration-addons/:addonId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_addons.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, addonId } = registration_schemas_1.registrationAddonParamsSchema.parse(req.params);
    const input = registration_schemas_1.updateRegistrationAddonSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    if (input.registrationTypeId) {
        const registrationType = await registrationsRepository.findRegistrationType(eventId, input.registrationTypeId);
        if (!registrationType) {
            throw new app_error_1.AppError('Registration type not found', 404, 'REGISTRATION_TYPE_NOT_FOUND');
        }
    }
    const addon = await registrationsRepository.updateRegistrationAddon(eventId, addonId, input);
    if (!addon) {
        throw new app_error_1.AppError('Registration add-on not found', 404, 'REGISTRATION_ADDON_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration add-on updated successfully', addon);
}));
exports.registrationsRouter.delete('/:eventId/registration-addons/:addonId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_addons.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, addonId } = registration_schemas_1.registrationAddonParamsSchema.parse(req.params);
    const removed = await registrationsRepository.deleteRegistrationAddon(eventId, addonId);
    if (!removed) {
        throw new app_error_1.AppError('Registration add-on not found', 404, 'REGISTRATION_ADDON_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration add-on deleted successfully');
}));
exports.registrationsRouter.get('/:eventId/registration-addons', optional_authenticate_middleware_1.optionalAuthenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || (event.status !== 'published' && !req.user)) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const addons = await registrationsRepository.listRegistrationAddons(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Registration add-ons retrieved successfully', addons);
}));
exports.registrationsRouter.get('/:eventId/registration-types', optional_authenticate_middleware_1.optionalAuthenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || (event.status !== 'published' && !req.user)) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const registrationTypes = await registrationsRepository.listRegistrationTypes(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Registration types retrieved successfully', registrationTypes);
}));
exports.registrationsRouter.patch('/:eventId/registration-types/:registrationTypeId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const registrationTypeId = String(req.params.registrationTypeId ?? '');
    const input = registration_schemas_1.updateRegistrationTypeSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const registrationType = await registrationsRepository.updateRegistrationType(eventId, registrationTypeId, input);
    if (!registrationType) {
        throw new app_error_1.AppError('Registration type not found', 404, 'REGISTRATION_TYPE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration type updated successfully', registrationType);
}));
exports.registrationsRouter.delete('/:eventId/registration-types/:registrationTypeId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const registrationTypeId = String(req.params.registrationTypeId ?? '');
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const removed = await registrationsRepository.deactivateRegistrationType(eventId, registrationTypeId);
    if (!removed) {
        throw new app_error_1.AppError('Registration type not found', 404, 'REGISTRATION_TYPE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration type deleted successfully');
}));
exports.registrationsRouter.get('/:eventId/registration-forms', optional_authenticate_middleware_1.optionalAuthenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || (event.status !== 'published' && !req.user)) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const forms = await registrationsRepository.listRegistrationForms(eventId, Boolean(req.user));
    return (0, api_response_1.sendSuccess)(res, 'Registration forms retrieved successfully', forms);
}));
exports.registrationsRouter.post('/:eventId/registration-forms', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_forms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createRegistrationFormSchema.parse(req.body);
    const form = await registrationsRepository.createRegistrationForm(eventId, { ...input, userId: req.user.id });
    return (0, api_response_1.sendSuccess)(res, 'Registration form created successfully', form, 201);
}));
exports.registrationsRouter.post('/:eventId/registration-forms/:formId/fields', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registration_forms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { formId } = registration_schemas_1.registrationFormParamsSchema.parse(req.params);
    const input = registration_schemas_1.createRegistrationFormFieldSchema.parse(req.body);
    const field = await registrationsRepository.createRegistrationFormField(formId, input);
    return (0, api_response_1.sendSuccess)(res, 'Registration form field created successfully', field, 201);
}));
exports.registrationsRouter.post('/:eventId/registration-files', optional_authenticate_middleware_1.optionalAuthenticateMiddleware, registrationFileUpload.single('file'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || event.status !== 'published') {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    if (!req.file) {
        throw new app_error_1.AppError('File is required', 400, 'FILE_REQUIRED');
    }
    if (!req.file.mimetype.startsWith('image/')) {
        throw new app_error_1.AppError('Only image files are allowed', 400, 'REGISTRATION_IMAGE_REQUIRED');
    }
    const category = 'registration_profile';
    const categoryId = await filesRepository.findOrCreateCategoryIdByName(category);
    const stored = await fileStorageService.save(req.file, { category, eventId });
    try {
        const file = await filesRepository.createFile({
            categoryId,
            eventId,
            ownerUserId: req.user?.id ?? null,
            originalName: stored.originalName,
            storedName: stored.storedName,
            storagePath: stored.storagePath,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            checksumSha256: stored.checksumSha256,
        });
        const { storagePath: _storagePath, ...safeFile } = file;
        return (0, api_response_1.sendSuccess)(res, 'Registration file uploaded successfully', safeFile, 201);
    }
    catch (error) {
        await fileStorageService.remove(stored.storagePath);
        throw error;
    }
}));
exports.registrationsRouter.post('/:eventId/participant-enrollments', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createParticipantEnrollmentSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || event.status !== 'published') {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const participant = await authService.registerOrAuthenticateExisting({
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
    });
    const registrationTypeId = input.registrationTypeId ?? (await registrationsRepository.findDefaultRegistrationTypeForProgram(eventId, input.programId ?? null))?.id;
    if (!registrationTypeId) {
        throw new app_error_1.AppError('No registration package is available for this program', 409, 'REGISTRATION_PACKAGE_REQUIRED');
    }
    const registration = await registrationsRepository.createRegistration({
        eventId,
        registrationTypeId,
        programId: input.programId ?? null,
        userId: participant.id,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        deferForm: true,
        deferPaymentSelection: true,
    });
    const session = await authService.issueSessionForUser(participant.id);
    return (0, api_response_1.sendSuccess)(res, 'Participant enrollment created successfully', {
        registration,
        session,
    }, 201);
}));
exports.registrationsRouter.post('/:eventId/registrations', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createRegistrationSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || event.status !== 'published') {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const registration = await registrationsRepository.createRegistration({
        ...input,
        eventId,
        userId: req.user?.id,
        email: req.user?.email ?? input.email,
    });
    return (0, api_response_1.sendSuccess)(res, 'Registration created successfully', registration, 201);
}));
exports.registrationsRouter.patch('/:eventId/registrations/:id/my-profile', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = registration_schemas_1.registrationParamsSchema.parse(req.params);
    const input = registration_schemas_1.updateMyRegistrationSchema.parse(req.body);
    const registration = await registrationsRepository.updateMyRegistration(eventId, id, req.user.id, input);
    if (!registration) {
        throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration profile updated successfully', registration);
}));
exports.registrationsRouter.get('/:eventId/materials', optional_authenticate_middleware_1.optionalAuthenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const canManageMaterials = req.user?.permissions.includes('event_materials.manage') ?? false;
    const materials = canManageMaterials
        ? await registrationsRepository.listEventMaterials(eventId, true)
        : req.user
            ? await registrationsRepository.listEventMaterialsForParticipant(eventId, req.user.id)
            : await registrationsRepository.listEventMaterials(eventId, false);
    return (0, api_response_1.sendSuccess)(res, 'Event materials retrieved successfully', materials);
}));
exports.registrationsRouter.post('/:eventId/materials', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('event_materials.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createEventMaterialSchema.parse(req.body);
    const material = await registrationsRepository.createEventMaterial(eventId, { ...input, userId: req.user.id });
    return (0, api_response_1.sendSuccess)(res, 'Event material created successfully', material, 201);
}));
exports.registrationsRouter.delete('/:eventId/materials/:materialId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('event_materials.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, materialId } = registration_schemas_1.eventMaterialParamsSchema.parse(req.params);
    const removed = await registrationsRepository.deactivateEventMaterial(eventId, materialId);
    if (!removed) {
        throw new app_error_1.AppError('Event material not found', 404, 'EVENT_MATERIAL_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event material deleted successfully');
}));
exports.registrationsRouter.get('/:eventId/certificate-templates', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('certificates.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const templates = await registrationsRepository.listCertificateTemplates(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Certificate templates retrieved successfully', templates);
}));
exports.registrationsRouter.post('/:eventId/certificate-templates', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('certificates.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const input = registration_schemas_1.createCertificateTemplateSchema.parse(req.body);
    const template = await registrationsRepository.createCertificateTemplate(eventId, { ...input, userId: req.user.id });
    return (0, api_response_1.sendSuccess)(res, 'Certificate template created successfully', template, 201);
}));
exports.registrationsRouter.patch('/:eventId/certificate-templates/:templateId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('certificates.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, templateId } = registration_schemas_1.certificateTemplateParamsSchema.parse(req.params);
    const input = registration_schemas_1.updateCertificateTemplateSchema.parse(req.body);
    const template = await registrationsRepository.updateCertificateTemplate(eventId, templateId, input);
    if (!template) {
        throw new app_error_1.AppError('Certificate template not found', 404, 'CERTIFICATE_TEMPLATE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Certificate template updated successfully', template);
}));
exports.registrationsRouter.delete('/:eventId/certificate-templates/:templateId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('certificates.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, templateId } = registration_schemas_1.certificateTemplateParamsSchema.parse(req.params);
    const removed = await registrationsRepository.deleteCertificateTemplate(eventId, templateId);
    if (!removed) {
        throw new app_error_1.AppError('Certificate template not found', 404, 'CERTIFICATE_TEMPLATE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Certificate template deleted successfully');
}));
exports.registrationsRouter.post('/:eventId/certificate-templates/:templateId/issue', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('certificates.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, templateId } = registration_schemas_1.certificateTemplateParamsSchema.parse(req.params);
    const input = registration_schemas_1.issueCertificateSchema.parse(req.body);
    const certificate = await registrationsRepository.issueCertificate(eventId, templateId, input.registrationId, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Certificate issued successfully', certificate, 201);
}));
exports.registrationsRouter.get('/:eventId/registrations', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = registration_schemas_1.registrationEventParamsSchema.parse(req.params);
    const registrations = await registrationsRepository.listEventRegistrations(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Event registrations retrieved successfully', registrations);
}));
exports.registrationsRouter.get('/:eventId/registrations/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = registration_schemas_1.registrationParamsSchema.parse(req.params);
    const registration = await registrationsRepository.findEventRegistration(eventId, id);
    if (!registration) {
        throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration retrieved successfully', registration);
}));
exports.registrationsRouter.patch('/:eventId/registrations/:id/status', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = registration_schemas_1.registrationParamsSchema.parse(req.params);
    const input = registration_schemas_1.updateRegistrationStatusSchema.parse(req.body);
    const registration = await registrationsRepository.updateRegistrationStatus(eventId, id, input.status, req.user.id, input.reason);
    if (!registration) {
        throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration status updated successfully', registration);
}));
exports.registrationsRouter.post('/:eventId/registrations/:id/approve-speaker', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = registration_schemas_1.registrationParamsSchema.parse(req.params);
    const registration = await registrationsRepository.approveRegistrationAsSpeaker(eventId, id, req.user.id);
    if (!registration) {
        throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Participant approved as speaker', registration);
}));
exports.registrationsRouter.post('/:eventId/registrations/:id/keep-as-participant', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('registrations.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = registration_schemas_1.registrationParamsSchema.parse(req.params);
    const registration = await registrationsRepository.keepRegistrationAsParticipant(eventId, id, req.user.id);
    if (!registration) {
        throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Registration kept as participant', registration);
}));
exports.myRegistrationsRouter.get('/registrations', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const registrations = await registrationsRepository.listMyRegistrations(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'My registrations retrieved successfully', registrations);
}));
//# sourceMappingURL=registrations.routes.js.map