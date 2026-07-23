import { Event } from '../../domain/entities/event';
export declare class EventsRepository {
    listEvents(): Promise<Event[]>;
    listEventsForUser(userId: string): Promise<Event[]>;
    countActiveEventsByTenant(tenantId: string): Promise<number>;
    findCurrentEventByTenant(tenantId: string): Promise<Event | null>;
    createEvent(input: {
        tenantId: string;
        name: string;
        slug?: string;
        description?: string;
        startsAt?: Date;
        endsAt?: Date;
        mainModality?: string;
        createdBy?: string;
    }): Promise<Event>;
    eventSlugExists(tenantId: string, slug: string, excludeId?: string): Promise<boolean>;
    findEventById(id: string): Promise<Event | null>;
    findPublishedBySlug(slug: string): Promise<Event | null>;
    updateEvent(id: string, input: {
        name?: string;
        slug?: string;
        description?: string | null;
        startsAt?: Date | null;
        endsAt?: Date | null;
        mainModality?: string | null;
        logoFileId?: string | null;
        updatedBy?: string;
    }): Promise<Event | null>;
    softDeleteEvent(id: string, userId: string): Promise<Event | null>;
    publishEvent(id: string, userId: string): Promise<Event | null>;
    cloneEventDesign(sourceEventId: string, targetEventId: string, userId: string): Promise<void>;
    unpublishEvent(id: string, userId: string): Promise<Event | null>;
}
