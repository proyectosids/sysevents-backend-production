"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationsRouter = exports.restoreSchema = exports.translateSchema = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const egress_ip_service_1 = require("../services/egress-ip.service");
const translation_cache_service_1 = require("../services/translation-cache.service");
exports.translateSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid().optional(),
    targetLanguage: zod_1.z.enum(['en', 'fr', 'pt', 'de', 'it']),
    texts: zod_1.z.array(zod_1.z.string().trim().min(1).max(10_000)).min(1).max(250),
});
exports.restoreSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid().optional(),
    sourceLanguage: zod_1.z.enum(['en', 'fr', 'pt', 'de', 'it']),
    texts: zod_1.z.array(zod_1.z.string().trim().min(1).max(10_000)).min(1).max(250),
});
const service = new translation_cache_service_1.TranslationCacheService();
exports.translationsRouter = (0, express_1.Router)();
exports.translationsRouter.get('/diagnostics/egress-ip', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('site_studio.manage'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    try {
        const result = await (0, egress_ip_service_1.detectPublicEgressIp)();
        return (0, api_response_1.sendSuccess)(res, 'Public backend egress IP detected', result);
    }
    catch {
        throw new app_error_1.AppError('No se pudo detectar la IP publica de salida del servidor.', 503, 'EGRESS_IP_DETECTION_FAILED');
    }
}));
exports.translationsRouter.post('/translate', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = exports.translateSchema.parse(req.body);
    const translations = await service.translateMany(input.texts, input.targetLanguage, input.eventId);
    return (0, api_response_1.sendSuccess)(res, 'Translations resolved', translations);
}));
exports.translationsRouter.post('/restore', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = exports.restoreSchema.parse(req.body);
    const translations = await service.restoreMany(input.texts, input.sourceLanguage, input.eventId);
    return (0, api_response_1.sendSuccess)(res, 'Translations restored', translations);
}));
//# sourceMappingURL=translations.routes.js.map