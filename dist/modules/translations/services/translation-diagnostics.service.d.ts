import { EventTranslationRepository, type PersistentTargetLanguage } from '../infrastructure/repositories/event-translation.repository';
import { TranslationUsageRepository } from '../infrastructure/repositories/translation-usage.repository';
export declare class TranslationDiagnosticsService {
    private readonly usageRepository;
    private readonly translationRepository;
    constructor(usageRepository?: Pick<TranslationUsageRepository, 'listUsageHistory'>, translationRepository?: Pick<EventTranslationRepository, 'getEventStats' | 'listEventTranslations'>);
    getEventDiagnostics(eventId: string, input: {
        targetLanguage?: PersistentTargetLanguage;
        limit: number;
        offset: number;
    }): Promise<{
        measurement: {
            source: string;
            authoritativeGoogleBilling: boolean;
            description: string;
            resetTimezone: string;
        };
        provider: {
            name: string;
            enabled: boolean;
            apiKeyConfigured: boolean;
        };
        currentMonth: {
            month: string;
            charactersUsed: number;
            monthlyLimit: number;
            charactersRemaining: number;
            usagePercent: number;
            limitReached: boolean;
        };
        history: {
            month: string;
            charactersUsed: number;
            updatedAt: Date;
        }[];
        storage: {
            translationsTable: string;
            usageTable: string;
        };
        event: {
            eventId: string;
            totalTranslations: number;
            byLanguage: {
                targetLanguage: PersistentTargetLanguage;
                translationCount: number;
                sourceCharacters: number;
                translatedCharacters: number;
                lastUpdatedAt: Date | null;
            }[];
            translations: {
                total: number;
                limit: number;
                offset: number;
                items: {
                    id: string;
                    sourceLanguage: string;
                    targetLanguage: PersistentTargetLanguage;
                    sourceText: string;
                    translatedText: string;
                    provider: string;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
            };
        };
    }>;
}
