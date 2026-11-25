type SupportedTargetLanguage = 'en' | 'fr' | 'pt' | 'de' | 'it';
type TranslationMap = Record<string, string>;
export declare function translateWithGoogle(text: string, targetLanguage: SupportedTargetLanguage): Promise<string>;
export declare function translateGroupWithGoogle(texts: string[], targetLanguage: SupportedTargetLanguage): Promise<Map<string, string>>;
export declare class TranslationCacheService {
    private readonly languageQueues;
    translateMany(texts: string[], targetLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
    private translateManyExclusive;
    restoreMany(texts: string[], sourceLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
}
export {};
