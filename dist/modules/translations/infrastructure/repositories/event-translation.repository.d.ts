export type PersistentTargetLanguage = 'en' | 'fr' | 'pt' | 'de' | 'it';
export declare function translationSourceHash(text: string): string;
export declare class EventTranslationRepository {
    findMany(eventId: string, targetLanguage: PersistentTargetLanguage): Promise<Record<string, string>>;
    upsertMany(eventId: string, targetLanguage: PersistentTargetLanguage, translations: Record<string, string>, provider?: string): Promise<void>;
}
