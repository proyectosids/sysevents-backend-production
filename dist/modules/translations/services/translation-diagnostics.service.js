"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationDiagnosticsService = void 0;
const env_1 = require("../../../config/env");
const event_translation_repository_1 = require("../infrastructure/repositories/event-translation.repository");
const translation_usage_repository_1 = require("../infrastructure/repositories/translation-usage.repository");
const translation_month_1 = require("./translation-month");
class TranslationDiagnosticsService {
    usageRepository;
    translationRepository;
    constructor(usageRepository = new translation_usage_repository_1.TranslationUsageRepository(), translationRepository = new event_translation_repository_1.EventTranslationRepository()) {
        this.usageRepository = usageRepository;
        this.translationRepository = translationRepository;
    }
    async getEventDiagnostics(eventId, input) {
        const [history, byLanguage, translations] = await Promise.all([
            this.usageRepository.listUsageHistory(12),
            this.translationRepository.getEventStats(eventId),
            this.translationRepository.listEventTranslations(eventId, input),
        ]);
        const usageMonth = (0, translation_month_1.currentTranslationUsageMonth)();
        const charactersUsed = history.find((entry) => entry.month === usageMonth)?.charactersUsed ?? 0;
        const monthlyLimit = env_1.env.GOOGLE_CLOUD_TRANSLATION_MONTHLY_CHARACTER_LIMIT;
        const charactersRemaining = Math.max(0, monthlyLimit - charactersUsed);
        return {
            measurement: {
                source: 'sysevents-internal-meter',
                authoritativeGoogleBilling: false,
                description: 'Contabiliza caracteres enviados correctamente por SysEvents. La facturacion oficial se consulta en Google Cloud.',
                resetTimezone: 'America/Los_Angeles',
            },
            provider: {
                name: 'google-cloud-translation-basic-v2',
                enabled: env_1.env.GOOGLE_CLOUD_TRANSLATION_ENABLED,
                apiKeyConfigured: Boolean(env_1.env.GOOGLE_CLOUD_TRANSLATION_API_KEY),
            },
            currentMonth: {
                month: usageMonth,
                charactersUsed,
                monthlyLimit,
                charactersRemaining,
                usagePercent: monthlyLimit ? Number(((charactersUsed / monthlyLimit) * 100).toFixed(2)) : 0,
                limitReached: charactersRemaining === 0,
            },
            history,
            storage: {
                translationsTable: 'dbo.event_site_translations',
                usageTable: 'dbo.translation_monthly_usage',
            },
            event: {
                eventId,
                totalTranslations: translations.total,
                byLanguage,
                translations: {
                    total: translations.total,
                    limit: input.limit,
                    offset: input.offset,
                    items: translations.items,
                },
            },
        };
    }
}
exports.TranslationDiagnosticsService = TranslationDiagnosticsService;
//# sourceMappingURL=translation-diagnostics.service.js.map