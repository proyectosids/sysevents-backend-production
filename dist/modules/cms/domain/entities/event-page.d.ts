export type CmsStatus = 'draft' | 'published';
export type EventPage = {
    id: string;
    eventId: string;
    title: string;
    slug: string;
    status: CmsStatus;
    sortOrder: number;
};
export type EventPageSection = {
    id: string;
    eventId: string;
    pageId: string | null;
    sectionType: string;
    title: string | null;
    content: unknown;
    status: CmsStatus;
    sortOrder: number;
};
