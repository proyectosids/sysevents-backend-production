"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const cms_repository_1 = require("../infrastructure/repositories/cms.repository");
const cms_schemas_1 = require("./schemas/cms.schemas");
exports.cmsRouter = (0, express_1.Router)({ mergeParams: true });
const cmsRepository = new cms_repository_1.CmsRepository();
const eventsRepository = new events_repository_1.EventsRepository();
async function ensureEvent(eventId) {
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return event;
}
exports.cmsRouter.get('/:eventId/pages', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = cms_schemas_1.cmsEventParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const pages = await cmsRepository.listPages(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Event pages retrieved successfully', pages);
}));
exports.cmsRouter.post('/:eventId/pages', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = cms_schemas_1.cmsEventParamsSchema.parse(req.params);
    const input = cms_schemas_1.createPageSchema.parse(req.body);
    await ensureEvent(eventId);
    const page = await cmsRepository.createPage(eventId, { ...input, createdBy: req.user.id });
    return (0, api_response_1.sendSuccess)(res, 'Event page created successfully', page, 201);
}));
exports.cmsRouter.patch('/:eventId/pages/:pageId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, pageId } = cms_schemas_1.pageParamsSchema.parse(req.params);
    const input = cms_schemas_1.updatePageSchema.parse(req.body);
    await ensureEvent(eventId);
    const page = await cmsRepository.updatePage(eventId, pageId, { ...input, updatedBy: req.user.id });
    if (!page) {
        throw new app_error_1.AppError('Event page not found', 404, 'EVENT_PAGE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event page updated successfully', page);
}));
exports.cmsRouter.delete('/:eventId/pages/:pageId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, pageId } = cms_schemas_1.pageParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const result = await cmsRepository.deletePage(eventId, pageId, req.user.id);
    if (!result) {
        throw new app_error_1.AppError('Event page not found', 404, 'EVENT_PAGE_NOT_FOUND');
    }
    if (!result.deleted) {
        throw new app_error_1.AppError('Only draft pages can be deleted', 409, 'EVENT_PAGE_MUST_BE_DRAFT');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event page deleted successfully');
}));
exports.cmsRouter.get('/:eventId/sections', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = cms_schemas_1.cmsEventParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const sections = await cmsRepository.listSections(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Event sections retrieved successfully', sections);
}));
exports.cmsRouter.post('/:eventId/sections', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = cms_schemas_1.cmsEventParamsSchema.parse(req.params);
    const input = cms_schemas_1.createSectionSchema.parse(req.body);
    await ensureEvent(eventId);
    const section = await cmsRepository.createSection(eventId, { ...input, createdBy: req.user.id });
    return (0, api_response_1.sendSuccess)(res, 'Event section created successfully', section, 201);
}));
exports.cmsRouter.patch('/:eventId/sections/:sectionId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, sectionId } = cms_schemas_1.sectionParamsSchema.parse(req.params);
    const input = cms_schemas_1.updateSectionSchema.parse(req.body);
    await ensureEvent(eventId);
    const section = await cmsRepository.updateSection(eventId, sectionId, { ...input, updatedBy: req.user.id });
    if (!section) {
        throw new app_error_1.AppError('Event section not found', 404, 'EVENT_SECTION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event section updated successfully', section);
}));
exports.cmsRouter.delete('/:eventId/sections/:sectionId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, sectionId } = cms_schemas_1.sectionParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const section = await cmsRepository.deleteSection(eventId, sectionId, req.user.id);
    if (!section) {
        throw new app_error_1.AppError('Event section not found', 404, 'EVENT_SECTION_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event section deleted successfully');
}));
//# sourceMappingURL=cms.routes.js.map