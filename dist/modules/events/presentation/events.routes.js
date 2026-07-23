"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const files_repository_1 = require("../../files/infrastructure/repositories/files.repository");
const saas_repository_1 = require("../../saas/infrastructure/repositories/saas.repository");
const tenants_repository_1 = require("../../tenants/infrastructure/repositories/tenants.repository");
const events_repository_1 = require("../infrastructure/repositories/events.repository");
const event_schemas_1 = require("./schemas/event.schemas");
exports.eventsRouter = (0, express_1.Router)();
const eventsRepository = new events_repository_1.EventsRepository();
const tenantsRepository = new tenants_repository_1.TenantsRepository();
const saasRepository = new saas_repository_1.SaasRepository();
const filesRepository = new files_repository_1.FilesRepository();
function isPlatformAdmin(permissions) {
    return permissions.includes('subscriptions.manage');
}
async function assertCanManageTenant(userId, permissions, tenantId) {
    if (isPlatformAdmin(permissions)) {
        return;
    }
    const membership = await tenantsRepository.findTenantUser(tenantId, userId);
    if (!membership || !['owner', 'admin'].includes(membership.tenantRole)) {
        throw new app_error_1.AppError('You do not have access to this tenant', 403, 'FORBIDDEN');
    }
}
async function assertCanAccessEvent(userId, permissions, tenantId) {
    if (isPlatformAdmin(permissions)) {
        return;
    }
    const membership = await tenantsRepository.findTenantUser(tenantId, userId);
    if (!membership) {
        throw new app_error_1.AppError('You do not have access to this event', 403, 'FORBIDDEN');
    }
}
exports.eventsRouter.get('/', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const events = isPlatformAdmin(req.user.permissions)
        ? await eventsRepository.listEvents()
        : await eventsRepository.listEventsForUser(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Events retrieved successfully', events);
}));
exports.eventsRouter.post('/', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.create'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = event_schemas_1.createEventSchema.parse(req.body);
    await assertCanManageTenant(req.user.id, req.user.permissions, input.tenantId);
    if (input.templateEventId) {
        const templateEvent = await eventsRepository.findEventById(input.templateEventId);
        if (!templateEvent || templateEvent.tenantId !== input.tenantId) {
            throw new app_error_1.AppError('Template event not found', 404, 'TEMPLATE_EVENT_NOT_FOUND');
        }
    }
    const subscription = await saasRepository.findActiveSubscriptionByTenant(input.tenantId);
    if (!subscription) {
        throw new app_error_1.AppError('Tenant does not have an active subscription', 402, 'SUBSCRIPTION_REQUIRED');
    }
    const totalEvents = await eventsRepository.countActiveEventsByTenant(input.tenantId);
    if (totalEvents >= subscription.limits.maxEvents) {
        throw new app_error_1.AppError('Plan event limit reached', 403, 'PLAN_EVENT_LIMIT_REACHED');
    }
    const { templateEventId, ...eventInput } = input;
    const event = await eventsRepository.createEvent({
        ...eventInput,
        createdBy: req.user.id,
    });
    if (templateEventId) {
        await eventsRepository.cloneEventDesign(templateEventId, event.id, req.user.id);
    }
    return (0, api_response_1.sendSuccess)(res, 'Event created successfully', event, 201);
}));
exports.eventsRouter.get('/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = event_schemas_1.eventIdParamsSchema.parse(req.params);
    const event = await eventsRepository.findEventById(id);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    await assertCanAccessEvent(req.user.id, req.user.permissions, event.tenantId);
    return (0, api_response_1.sendSuccess)(res, 'Event retrieved successfully', event);
}));
exports.eventsRouter.patch('/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.update'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = event_schemas_1.eventIdParamsSchema.parse(req.params);
    const input = event_schemas_1.updateEventSchema.parse(req.body);
    const existingEvent = await eventsRepository.findEventById(id);
    if (!existingEvent) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    await assertCanManageTenant(req.user.id, req.user.permissions, existingEvent.tenantId);
    if (input.logoFileId) {
        const logoFile = await filesRepository.findById(input.logoFileId);
        if (!logoFile || logoFile.eventId !== id || !logoFile.mimeType.startsWith('image/')) {
            throw new app_error_1.AppError('Event logo must be an image uploaded for this event', 400, 'INVALID_EVENT_LOGO');
        }
    }
    const subscription = await saasRepository.findActiveSubscriptionByTenant(existingEvent.tenantId);
    if (!subscription) {
        throw new app_error_1.AppError('An active plan is required to publish this event', 402, 'SUBSCRIPTION_REQUIRED');
    }
    const event = await eventsRepository.updateEvent(id, { ...input, updatedBy: req.user.id });
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event updated successfully', event);
}));
exports.eventsRouter.delete('/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.delete'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = event_schemas_1.eventIdParamsSchema.parse(req.params);
    const existingEvent = await eventsRepository.findEventById(id);
    if (!existingEvent) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    await assertCanManageTenant(req.user.id, req.user.permissions, existingEvent.tenantId);
    const event = await eventsRepository.softDeleteEvent(id, req.user.id);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event deleted successfully');
}));
exports.eventsRouter.post('/:id/publish', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.publish'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = event_schemas_1.eventIdParamsSchema.parse(req.params);
    const existingEvent = await eventsRepository.findEventById(id);
    if (!existingEvent) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    await assertCanManageTenant(req.user.id, req.user.permissions, existingEvent.tenantId);
    const subscription = await saasRepository.findActiveSubscriptionByTenant(existingEvent.tenantId);
    if (!subscription) {
        throw new app_error_1.AppError('An active plan is required to publish this event', 402, 'SUBSCRIPTION_REQUIRED');
    }
    const event = await eventsRepository.publishEvent(id, req.user.id);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event published successfully', event);
}));
exports.eventsRouter.post('/:id/unpublish', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.publish'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = event_schemas_1.eventIdParamsSchema.parse(req.params);
    const existingEvent = await eventsRepository.findEventById(id);
    if (!existingEvent) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    await assertCanManageTenant(req.user.id, req.user.permissions, existingEvent.tenantId);
    const event = await eventsRepository.unpublishEvent(id, req.user.id);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Event unpublished successfully', event);
}));
//# sourceMappingURL=events.routes.js.map