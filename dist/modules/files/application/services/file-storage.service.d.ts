export declare class FileStorageService {
    private readonly rootPath;
    validate(file: Express.Multer.File): void;
    save(file: Express.Multer.File, context: {
        category: string;
        eventId?: string;
    }): Promise<{
        originalName: string;
        storedName: string;
        storagePath: string;
        checksumSha256: string;
        mimeType: string;
        sizeBytes: number;
    }>;
    private prepareFile;
    getAbsolutePath(storagePath: string): string;
    createSponsorLogoVariant(storagePath: string): Promise<Buffer<ArrayBufferLike>>;
    remove(storagePath: string): Promise<void>;
}
export declare function buildGeneratedFileName(date: Date, id: string, extension: string): string;
