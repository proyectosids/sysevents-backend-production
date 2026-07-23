"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communicationsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const communications_repository_1 = require("../infrastructure/repositories/communications.repository");
const communication_schemas_1 = require("./schemas/communication.schemas");
exports.communicationsRouter = (0, express_1.Router)();
const communicationsRepository = new communications_repository_1.CommunicationsRepository();
exports.communicationsRouter.get('/email-templates', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('email_templates.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const templates = await communicationsRepository.listTemplates();
    return (0, api_response_1.sendSuccess)(res, 'Email templates retrieved successfully', templates);
}));
exports.communicationsRouter.patch('/email-templates/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('email_templates.update'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = communication_schemas_1.emailTemplateParamsSchema.parse(req.params);
    const input = communication_schemas_1.updateEmailTemplateSchema.parse(req.body);
    const template = await communicationsRepository.updateTemplate(id, input);
    if (!template) {
        throw new app_error_1.AppError('Email template not found', 404, 'EMAIL_TEMPLATE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Email template updated successfully', template);
}));
exports.communicationsRouter.get('/email-logs', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('email_logs.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const logs = await communicationsRepository.listEmailLogs();
    return (0, api_response_1.sendSuccess)(res, 'Email logs retrieved successfully', logs);
}));
//# sourceMappingURL=communications.routes.js.map