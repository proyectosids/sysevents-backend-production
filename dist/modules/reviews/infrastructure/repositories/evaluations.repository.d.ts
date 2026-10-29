import sql from 'mssql';
export declare class EvaluationsRepository {
    listInvitations(eventId: string, userId: string, unrestricted?: boolean): Promise<sql.IRecordSet<any>>;
    findInvitation(invitationId: string, eventId: string): Promise<{
        id: string;
        program_id: string | null;
    }>;
    revokeInvitation(invitationId: string, eventId: string): Promise<boolean>;
    createInvitation(input: {
        eventId: string;
        programId?: string | null;
        email: string;
        tokenHash: string;
        expiresAt: Date;
        invitedBy: string;
    }): Promise<{
        id: string;
        event_name: string;
    }>;
    acceptInvitation(tokenHash: string, userId: string, userEmail: string): Promise<{
        eventId: string;
        programId: string | null;
    }>;
    assign(input: {
        submissionId: string;
        evaluatorUserId: string;
        evaluationFormId?: string | null;
        dueAt?: Date | null;
        assignedBy: string;
    }): Promise<any>;
    listMine(userId: string): Promise<sql.IRecordSet<any>>;
    printableFormFile(assignmentId: string, evaluatorUserId: string): Promise<string>;
    submit(input: {
        assignmentId: string;
        evaluatorUserId: string;
        answers: unknown;
        comments?: string | null;
    }): Promise<any>;
    participantFeedback(userId: string): Promise<sql.IRecordSet<any>>;
}
