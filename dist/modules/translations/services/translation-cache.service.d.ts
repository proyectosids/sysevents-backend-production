import { EventTranslationRepository, type PersistentTargetLanguage } from '../infrastructure/repositories/event-translation.repository';
import { TranslationUsageRepository } from '../infrastructure/repositories/translation-usage.repository';
type SupportedTargetLanguage = PersistentTargetLanguage;
type TranslationMap = Record<string, string>;
type TranslationRepository = Pick<EventTranslationRepository, 'findMany' | 'upsertMany'>;
type TranslationUsageStore = Pick<TranslationUsageRepository, 'reserveCharacters' | 'releaseCharacters'>;
type TranslationProvider = {
    translateMany(texts: string[], targetLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
};
export declare function translateGroupWithGoogle(texts: string[], targetLanguage: SupportedTargetLanguage, apiKey?: string | undefined): Promise<Map<string, string>>;
export declare function translateWithGoogle(text: string, targetLanguage: SupportedTargetLanguage, apiKey?: string | undefined): Promise<string>;
export declare class GoogleCloudTranslationProvider implements TranslationProvider {
    private readonly usageRepository;
    private readonly options;
    constructor(usageRepository?: TranslationUsageStore, options?: {
        enabled: boolean;
        apiKey?: string;
        monthlyCharacterLimit: number;
    });
    translateMany(texts: string[], targetLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
}
export declare function collectTranslatableStrings(value: unknown): string[];
export declare class TranslationCacheService {
    private readonly repository;
    private readonly provider;
    private readonly languageQueues;
    constructor(repository?: TranslationRepository, provider?: TranslationProvider);
    translateMany(texts: string[], targetLanguage: SupportedTargetLanguage, eventId?: string): Promise<TranslationMap>;
    private translateManyExclusive;
    restoreMany(texts: string[], sourceLanguage: SupportedTargetLanguage, eventId?: string): Promise<TranslationMap>;
    queueEventPretranslation(eventId: string, content: unknown, targetLanguages?: SupportedTargetLanguage[]): void;
}
export {};
