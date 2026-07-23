type SupportedTargetLanguage = 'en' | 'fr' | 'pt' | 'de' | 'it';
type TranslationMap = Record<string, string>;
export declare class TranslationCacheService {
    translateMany(texts: string[], targetLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
    restoreMany(texts: string[], sourceLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
}
export {};
