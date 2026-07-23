import { EventPage, EventPageSection } from '../../domain/entities/event-page';
export declare class CmsRepository {
    listPages(eventId: string, onlyPublished?: boolean): Promise<EventPage[]>;
    createPage(eventId: string, input: {
        title: string;
        slug?: string;
        status?: 'draft' | 'published';
        sortOrder?: number;
        createdBy?: string;
    }): Promise<EventPage>;
    restorePageForThemeChange(eventId: string, input: {
        title: string;
        slug: string;
        status: 'draft' | 'published';
        sortOrder: number;
        updatedBy: string;
    }): Promise<EventPage | null>;
    pageSlugExists(eventId: string, slug: string, excludeId?: string): Promise<boolean>;
    updatePage(eventId: string, pageId: string, input: {
        title?: string;
        slug?: string;
        status?: 'draft' | 'published';
        sortOrder?: number;
        updatedBy?: string;
    }): Promise<EventPage | null>;
    findPage(eventId: string, pageId: string): Promise<EventPage | null>;
    deletePage(eventId: string, pageId: string, userId: string): Promise<{
        page: EventPage;
        deleted: false;
    } | {
        page: EventPage;
        deleted: true;
    } | null>;
    archivePageForThemeChange(eventId: string, pageId: string, userId: string): Promise<EventPage | null>;
    listSections(eventId: string, onlyPublished?: boolean): Promise<EventPageSection[]>;
    createSection(eventId: string, input: {
        pageId?: string;
        sectionType: string;
        title?: string;
        content?: unknown;
        status?: 'draft' | 'published';
        sortOrder?: number;
        createdBy?: string;
    }): Promise<EventPageSection>;
    updateSection(eventId: string, sectionId: string, input: {
        pageId?: string | null;
        sectionType?: string;
        title?: string | null;
        content?: unknown;
        status?: 'draft' | 'published';
        sortOrder?: number;
        updatedBy?: string;
    }): Promise<EventPageSection | null>;
    deleteSection(eventId: string, sectionId: string, userId: string): Promise<EventPageSection | null>;
}
