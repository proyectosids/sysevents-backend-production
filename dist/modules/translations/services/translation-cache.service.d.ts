type SupportedTargetLanguage = 'en' | 'fr' | 'pt' | 'de' | 'it';
type TranslationMap = Record<string, string>;
export declare function translateWithGoogle(text: string, targetLanguage: SupportedTargetLanguage): Promise<string>;
export declare class TranslationCacheService {
    translateMany(texts: string[], targetLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
    restoreMany(texts: string[], sourceLanguage: SupportedTargetLanguage): Promise<TranslationMap>;
}
export {};
