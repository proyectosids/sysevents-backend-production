"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const reports_repository_1 = require("../infrastructure/repositories/reports.repository");
const report_schemas_1 = require("./schemas/report.schemas");
exports.reportsRouter = (0, express_1.Router)();
const reportsRepository = new reports_repository_1.ReportsRepository();
exports.reportsRouter.use(authenticate_middleware_1.authenticateMiddleware);
exports.reportsRouter.use((0, require_permission_middleware_1.requirePermission)('reports.read'));
async function resolveScope(req, eventId) {
    const user = req.user;
    const canViewAllPrograms = user.permissions.includes('registrations.read');
    return reportsRepository.getScope(eventId, user.id, canViewAllPrograms);
}
exports.reportsRouter.get('/:eventId/reports/summary', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = report_schemas_1.reportEventParamsSchema.parse(req.params);
    const scope = await resolveScope(req, eventId);
    const report = await reportsRepository.getSummary(eventId, scope);
    return (0, api_response_1.sendSuccess)(res, 'Event summary report retrieved successfully', { ...report, scope });
}));
exports.reportsRouter.get('/:eventId/reports/context', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = report_schemas_1.reportEventParamsSchema.parse(req.params);
    const scope = await resolveScope(req, eventId);
    const context = await reportsRepository.getContext(eventId, scope);
    return (0, api_response_1.sendSuccess)(res, 'Report context retrieved successfully', context);
}));
exports.reportsRouter.post('/:eventId/reports/query', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = report_schemas_1.reportEventParamsSchema.parse(req.params);
    const input = report_schemas_1.dynamicReportQuerySchema.parse(req.body);
    const scope = await resolveScope(req, eventId);
    const report = await reportsRepository.runDynamicReport(eventId, scope, input, input.includeDetails);
    return (0, api_response_1.sendSuccess)(res, 'Dynamic report generated successfully', report);
}));
exports.reportsRouter.get('/:eventId/reports/definitions', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = report_schemas_1.reportEventParamsSchema.parse(req.params);
    await resolveScope(req, eventId);
    const definitions = await reportsRepository.listDefinitions(eventId, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Saved reports retrieved successfully', definitions);
}));
exports.reportsRouter.post('/:eventId/reports/definitions', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = report_schemas_1.reportEventParamsSchema.parse(req.params);
    const input = report_schemas_1.saveReportDefinitionSchema.parse(req.body);
    await resolveScope(req, eventId);
    const definition = await reportsRepository.createDefinition(eventId, req.user.id, input.name, input.config);
    return (0, api_response_1.sendSuccess)(res, 'Report saved successfully', definition, 201);
}));
exports.reportsRouter.put('/:eventId/reports/definitions/:definitionId', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, definitionId } = report_schemas_1.reportDefinitionParamsSchema.parse(req.params);
    const input = report_schemas_1.saveReportDefinitionSchema.parse(req.body);
    await resolveScope(req, eventId);
    const definition = await reportsRepository.updateDefinition(eventId, req.user.id, definitionId, input.name, input.config);
    if (!definition)
        throw new app_error_1.AppError('Saved report not found', 404, 'REPORT_DEFINITION_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Report updated successfully', definition);
}));
exports.reportsRouter.delete('/:eventId/reports/definitions/:definitionId', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, definitionId } = report_schemas_1.reportDefinitionParamsSchema.parse(req.params);
    await resolveScope(req, eventId);
    const deleted = await reportsRepository.deleteDefinition(eventId, req.user.id, definitionId);
    if (!deleted)
        throw new app_error_1.AppError('Saved report not found', 404, 'REPORT_DEFINITION_NOT_FOUND');
    return (0, api_response_1.sendSuccess)(res, 'Report deleted successfully', null);
}));
//# sourceMappingURL=reports.routes.js.map