"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicEventsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const events_repository_1 = require("../infrastructure/repositories/events.repository");
const event_schemas_1 = require("./schemas/event.schemas");
exports.publicEventsRouter = (0, express_1.Router)();
const eventsRepository = new events_repository_1.EventsRepository();
exports.publicEventsRouter.get('/events/:slug', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { slug } = event_schemas_1.publicEventParamsSchema.parse(req.params);
    const event = await eventsRepository.findPublishedBySlug(slug);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Public event retrieved successfully', event);
}));
//# sourceMappingURL=public-events.routes.js.map