"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const translation_cache_service_1 = require("../services/translation-cache.service");
const translateSchema = zod_1.z.object({
    targetLanguage: zod_1.z.enum(['en', 'fr', 'pt', 'de', 'it']),
    texts: zod_1.z.array(zod_1.z.string().trim().min(1).max(1000)).min(1).max(100),
});
const restoreSchema = zod_1.z.object({
    sourceLanguage: zod_1.z.enum(['en', 'fr', 'pt', 'de', 'it']),
    texts: zod_1.z.array(zod_1.z.string().trim().min(1).max(1000)).min(1).max(100),
});
const service = new translation_cache_service_1.TranslationCacheService();
exports.translationsRouter = (0, express_1.Router)();
exports.translationsRouter.post('/translate', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = translateSchema.parse(req.body);
    const translations = await service.translateMany(input.texts, input.targetLanguage);
    return (0, api_response_1.sendSuccess)(res, 'Translations resolved', translations);
}));
exports.translationsRouter.post('/restore', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = restoreSchema.parse(req.body);
    const translations = await service.restoreMany(input.texts, input.sourceLanguage);
    return (0, api_response_1.sendSuccess)(res, 'Translations restored', translations);
}));
//# sourceMappingURL=translations.routes.js.map