export type FileRecord = {
    id: string;
    categoryId: string | null;
    categoryName: string | null;
    tenantId: string | null;
    eventId: string | null;
    ownerUserId: string | null;
    originalName: string;
    storedName: string;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
    status: string;
    createdAt: Date;
};
