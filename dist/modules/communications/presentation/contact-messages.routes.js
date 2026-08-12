"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicContactMessagesRouter = exports.contactMessagesRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const tenants_repository_1 = require("../../tenants/infrastructure/repositories/tenants.repository");
const contact_messages_repository_1 = require("../infrastructure/repositories/contact-messages.repository");
const contact_message_schemas_1 = require("./schemas/contact-message.schemas");
exports.contactMessagesRouter = (0, express_1.Router)();
exports.publicContactMessagesRouter = (0, express_1.Router)();
const repository = new contact_messages_repository_1.ContactMessagesRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const tenantsRepository = new tenants_repository_1.TenantsRepository();
async function accessibleEvent(eventId, userId, permissions) {
    const event = await eventsRepository.findEventById(eventId);
    if (!event)
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    if (!permissions.includes('subscriptions.manage')) {
        const membership = await tenantsRepository.findTenantUser(event.tenantId, userId);
        if (!membership)
            throw new app_error_1.AppError('You do not have access to this event', 403, 'FORBIDDEN');
    }
    return event;
}
exports.publicContactMessagesRouter.post('/events/:eventId/contact-messages', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = contact_message_schemas_1.contactEventParamsSchema.parse(req.params);
    const input = contact_message_schemas_1.createContactMessageSchema.parse(req.body);
    const event = await eventsRepository.findEventById(eventId);
    if (!event || event.status !== 'published') {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    await repository.create({
        eventId,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 500),
    });
    return (0, api_response_1.sendSuccess)(res, 'Contact message received successfully', { received: true }, 201);
}));
exports.contactMessagesRouter.get('/:eventId/contact-messages', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = contact_message_schemas_1.contactEventParamsSchema.parse(req.params);
    const { status } = contact_message_schemas_1.listContactMessagesQuerySchema.parse(req.query);
    await accessibleEvent(eventId, req.user.id, req.user.permissions);
    return (0, api_response_1.sendSuccess)(res, 'Contact messages retrieved successfully', await repository.listByEvent(eventId, status));
}));
exports.contactMessagesRouter.patch('/:eventId/contact-messages/:messageId', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('events.update'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, messageId } = contact_message_schemas_1.contactMessageParamsSchema.parse(req.params);
    const { status } = contact_message_schemas_1.updateContactMessageSchema.parse(req.body);
    await accessibleEvent(eventId, req.user.id, req.user.permissions);
    const message = await repository.updateStatus(eventId, messageId, status);
    if (!message)
        throw new app_error_1.AppError('Contact message not found', 404, 'CONTACT_MESSAGE_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Contact message updated successfully', message);
}));
//# sourceMappingURL=contact-messages.routes.js.map