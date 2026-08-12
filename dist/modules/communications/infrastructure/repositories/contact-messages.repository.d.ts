export type ContactMessageStatus = 'new' | 'read' | 'archived';
export declare class ContactMessagesRepository {
    create(input: {
        eventId: string;
        name: string;
        email: string;
        subject: string;
        message: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<{
        id: string;
        eventId: string;
        name: string;
        email: string;
        subject: string;
        message: string;
        status: ContactMessageStatus;
        createdAt: Date;
        readAt: Date | null;
        archivedAt: Date | null;
    }>;
    listByEvent(eventId: string, status?: ContactMessageStatus): Promise<{
        id: string;
        eventId: string;
        name: string;
        email: string;
        subject: string;
        message: string;
        status: ContactMessageStatus;
        createdAt: Date;
        readAt: Date | null;
        archivedAt: Date | null;
    }[]>;
    updateStatus(eventId: string, id: string, status: ContactMessageStatus): Promise<{
        id: string;
        eventId: string;
        name: string;
        email: string;
        subject: string;
        message: string;
        status: ContactMessageStatus;
        createdAt: Date;
        readAt: Date | null;
        archivedAt: Date | null;
    } | null>;
}
