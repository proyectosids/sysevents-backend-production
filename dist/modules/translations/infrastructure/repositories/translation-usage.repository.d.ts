export declare class TranslationUsageRepository {
    reserveCharacters(usageMonth: string, requestedCharacters: number, monthlyLimit: number): Promise<boolean>;
    releaseCharacters(usageMonth: string, characters: number): Promise<void>;
}
