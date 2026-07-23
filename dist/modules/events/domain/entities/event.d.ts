export type EventStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type Event = {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description: string | null;
    logoFileId: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    mainModality: string | null;
    status: EventStatus;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    isHistorical: boolean;
};
