import { FileRecord } from '../../domain/entities/file-record';
export declare class FilesRepository {
    findCategoryIdByName(name: string): Promise<string>;
    findOrCreateCategoryIdByName(name: string): Promise<string>;
    createFile(input: {
        categoryId?: string | null;
        tenantId?: string | null;
        eventId?: string | null;
        ownerUserId?: string | null;
        originalName: string;
        storedName: string;
        storagePath: string;
        mimeType: string;
        sizeBytes: number;
        checksumSha256: string;
    }): Promise<FileRecord>;
    findById(id: string): Promise<FileRecord | null>;
    listFiles(input: {
        eventId?: string;
        tenantId?: string;
        mimePrefix?: string;
    }): Promise<FileRecord[]>;
    softDelete(id: string): Promise<FileRecord | null>;
    isPublicMaterial(fileId: string): Promise<boolean>;
    canUserDownloadEventMaterial(fileId: string, userId: string): Promise<boolean>;
}
