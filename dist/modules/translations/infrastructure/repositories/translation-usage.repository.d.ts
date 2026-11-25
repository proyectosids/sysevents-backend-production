export declare class TranslationUsageRepository {
    listUsageHistory(limit?: number): Promise<{
        month: string;
        charactersUsed: number;
        updatedAt: Date;
    }[]>;
    reserveCharacters(usageMonth: string, requestedCharacters: number, monthlyLimit: number): Promise<boolean>;
    releaseCharacters(usageMonth: string, characters: number): Promise<void>;
}
