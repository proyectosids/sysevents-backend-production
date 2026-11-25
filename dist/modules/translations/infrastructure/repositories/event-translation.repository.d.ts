export type PersistentTargetLanguage = 'en' | 'fr' | 'pt' | 'de' | 'it';
export declare function translationSourceHash(text: string): string;
export declare class EventTranslationRepository {
    getEventStats(eventId: string): Promise<{
        targetLanguage: PersistentTargetLanguage;
        translationCount: number;
        sourceCharacters: number;
        translatedCharacters: number;
        lastUpdatedAt: Date | null;
    }[]>;
    listEventTranslations(eventId: string, input: {
        targetLanguage?: PersistentTargetLanguage;
        limit: number;
        offset: number;
    }): Promise<{
        total: number;
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
    }>;
    findMany(eventId: string, targetLanguage: PersistentTargetLanguage): Promise<Record<string, string>>;
    upsertMany(eventId: string, targetLanguage: PersistentTargetLanguage, translations: Record<string, string>, provider?: string): Promise<void>;
}
