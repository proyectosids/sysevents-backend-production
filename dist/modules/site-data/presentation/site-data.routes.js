"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicSiteDataRouter = exports.siteDataRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const optional_authenticate_middleware_1 = require("../../iam/presentation/middlewares/optional-authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const site_data_repository_1 = require("../infrastructure/repositories/site-data.repository");
const site_data_schemas_1 = require("./schemas/site-data.schemas");
exports.siteDataRouter = (0, express_1.Router)();
exports.publicSiteDataRouter = (0, express_1.Router)();
const repository = new site_data_repository_1.SiteDataRepository();
const eventsRepository = new events_repository_1.EventsRepository();
async function assertEvent(eventId) {
    const event = await eventsRepository.findEventById(eventId);
    if (!event)
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    return event;
}
exports.siteDataRouter.get('/:eventId/site-data', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    await assertEvent(eventId);
    const [programs, knowledgeAreas, knowledgeLines, agendaDays, agendaItems, testimonials, speakers, faqs, sponsors, paymentSettings, paymentPolicy] = await Promise.all([
        repository.listPrograms(eventId),
        repository.listKnowledgeAreas(eventId),
        repository.listKnowledgeLines(eventId),
        repository.listAgendaDays(eventId),
        repository.listAgendaItems(eventId),
        repository.listTestimonials(eventId),
        repository.listSpeakers(eventId),
        repository.listFaqs(eventId),
        repository.listSponsors(eventId),
        repository.listPaymentSettings(eventId),
        repository.getPaymentPolicy(eventId),
    ]);
    return (0, api_response_1.sendSuccess)(res, 'Site data retrieved successfully', { programs, knowledgeAreas, knowledgeLines, agendaDays, agendaItems, testimonials, speakers, faqs, sponsors, paymentSettings, paymentPolicy });
}));
crudRoutes('programs', 'Programs', site_data_schemas_1.programSchema, site_data_schemas_1.updateProgramSchema, {
    list: (eventId) => repository.listPrograms(eventId),
    create: (eventId, input, userId) => repository.createProgram(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateProgram(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteProgram(eventId, id, userId),
});
crudRoutes('knowledge-areas', 'Knowledge areas', site_data_schemas_1.knowledgeAreaSchema, site_data_schemas_1.updateKnowledgeAreaSchema, {
    list: (eventId) => repository.listKnowledgeAreas(eventId),
    create: (eventId, input, userId) => repository.createKnowledgeArea(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateKnowledgeArea(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteKnowledgeArea(eventId, id, userId),
});
crudRoutes('knowledge-lines', 'Knowledge lines', site_data_schemas_1.knowledgeLineSchema, site_data_schemas_1.updateKnowledgeLineSchema, {
    list: (eventId) => repository.listKnowledgeLines(eventId),
    create: (eventId, input, userId) => repository.createKnowledgeLine(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateKnowledgeLine(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteKnowledgeLine(eventId, id, userId),
});
exports.siteDataRouter.get('/:eventId/site-data/agenda-days', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    return (0, api_response_1.sendSuccess)(res, 'Agenda days retrieved successfully', await repository.listAgendaDays(eventId));
}));
exports.siteDataRouter.post('/:eventId/site-data/agenda-days', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    await assertEvent(eventId);
    const item = await repository.createAgendaDay(eventId, site_data_schemas_1.agendaDaySchema.parse(req.body), req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Agenda day created successfully', item, 201);
}));
exports.siteDataRouter.patch('/:eventId/site-data/agenda-days/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
    const item = await repository.updateAgendaDay(eventId, id, site_data_schemas_1.updateAgendaDaySchema.parse(req.body), req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Agenda day updated successfully', item);
}));
exports.siteDataRouter.delete('/:eventId/site-data/agenda-days/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
    await repository.deleteAgendaDay(eventId, id, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Agenda day deleted successfully');
}));
exports.siteDataRouter.get('/:eventId/site-data/agenda-items', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    return (0, api_response_1.sendSuccess)(res, 'Agenda items retrieved successfully', await repository.listAgendaItems(eventId));
}));
exports.siteDataRouter.post('/:eventId/site-data/agenda-items', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    await assertEvent(eventId);
    const item = await repository.createAgendaItem(eventId, site_data_schemas_1.agendaItemSchema.parse(req.body), req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Agenda item created successfully', item, 201);
}));
exports.siteDataRouter.patch('/:eventId/site-data/agenda-items/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
    const item = await repository.updateAgendaItem(eventId, id, site_data_schemas_1.updateAgendaItemSchema.parse(req.body), req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Agenda item updated successfully', item);
}));
exports.siteDataRouter.delete('/:eventId/site-data/agenda-items/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
    await repository.deleteAgendaItem(eventId, id, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Agenda item deleted successfully');
}));
function crudRoutes(path, label, schema, updateSchema, methods) {
    exports.siteDataRouter.get(`/:eventId/site-data/${path}`, authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
        return (0, api_response_1.sendSuccess)(res, `${label} retrieved successfully`, await methods.list(eventId));
    }));
    exports.siteDataRouter.post(`/:eventId/site-data/${path}`, authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
        await assertEvent(eventId);
        return (0, api_response_1.sendSuccess)(res, `${label} created successfully`, await methods.create(eventId, schema.parse(req.body), req.user.id), 201);
    }));
    exports.siteDataRouter.patch(`/:eventId/site-data/${path}/:id`, authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
        return (0, api_response_1.sendSuccess)(res, `${label} updated successfully`, await methods.update(eventId, id, updateSchema.parse(req.body), req.user.id));
    }));
    exports.siteDataRouter.delete(`/:eventId/site-data/${path}/:id`, authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
        const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
        await methods.remove(eventId, id, req.user.id);
        return (0, api_response_1.sendSuccess)(res, `${label} deleted successfully`);
    }));
}
crudRoutes('testimonials', 'Testimonials', site_data_schemas_1.testimonialSchema, site_data_schemas_1.updateTestimonialSchema, {
    list: (eventId) => repository.listTestimonials(eventId),
    create: (eventId, input, userId) => repository.createTestimonial(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateTestimonial(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteTestimonial(eventId, id, userId),
});
crudRoutes('speakers', 'Speakers', site_data_schemas_1.speakerSchema, site_data_schemas_1.updateSpeakerSchema, {
    list: (eventId) => repository.listSpeakers(eventId),
    create: (eventId, input, userId) => repository.createSpeaker(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateSpeaker(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteSpeaker(eventId, id, userId),
});
crudRoutes('faqs', 'FAQ items', site_data_schemas_1.faqSchema, site_data_schemas_1.updateFaqSchema, {
    list: (eventId) => repository.listFaqs(eventId),
    create: (eventId, input, userId) => repository.createFaq(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateFaq(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteFaq(eventId, id, userId),
});
crudRoutes('sponsors', 'Sponsors', site_data_schemas_1.sponsorSchema, site_data_schemas_1.updateSponsorSchema, {
    list: (eventId) => repository.listSponsors(eventId),
    create: (eventId, input, userId) => repository.createSponsor(eventId, input, userId),
    update: (eventId, id, input, userId) => repository.updateSponsor(eventId, id, input, userId),
    remove: (eventId, id, userId) => repository.deleteSponsor(eventId, id, userId),
});
exports.siteDataRouter.get('/:eventId/site-data/payment-settings', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    return (0, api_response_1.sendSuccess)(res, 'Payment settings retrieved successfully', await repository.listPaymentSettings(eventId));
}));
exports.siteDataRouter.post('/:eventId/site-data/payment-settings', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_data_schemas_1.siteDataEventParamsSchema.parse(req.params);
    await assertEvent(eventId);
    const settings = await repository.upsertPaymentSettings(eventId, site_data_schemas_1.paymentSettingsSchema.parse(req.body), req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Payment settings saved successfully', settings, 201);
}));
exports.siteDataRouter.delete('/:eventId/site-data/payment-settings/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('cms.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, id } = site_data_schemas_1.siteDataItemParamsSchema.parse(req.params);
    await assertEvent(eventId);
    const removed = await repository.deletePaymentSettings(eventId, id, req.user.id);
    if (!removed)
        throw new app_error_1.AppError('Payment settings not found', 404, 'PAYMENT_SETTINGS_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Payment settings deleted successfully', null);
}));
exports.publicSiteDataRouter.get('/events/:slug/site-data', optional_authenticate_middleware_1.optionalAuthenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const event = await eventsRepository.findPublishedBySlug(slug);
    if (!event)
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Public site data retrieved successfully', await repository.publicBundle(event.id));
}));
//# sourceMappingURL=site-data.routes.js.map