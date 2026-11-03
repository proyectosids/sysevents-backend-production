import sql from 'mssql';
export declare class EvaluationsRepository {
    listEventAssignments(eventId: string, userId: string, unrestricted?: boolean): Promise<sql.IRecordSet<any>>;
    assignmentForSupervisor(assignmentId: string, userId: string, unrestricted?: boolean): Promise<any>;
    returnToEvaluator(assignmentId: string, reason: string, reviewedBy: string): Promise<any>;
    release(assignmentId: string, notes: string | null, reviewedBy: string): Promise<any>;
    assignMany(input: {
        eventId: string;
        submissionIds: string[];
        evaluatorUserId: string;
        assessmentFormatVersionId: string;
        dueAt?: Date | null;
        assignedBy: string;
        supervisorUserId: string;
        unrestricted: boolean;
    }): Promise<unknown[]>;
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
    deactivateEvaluatorScope(eventId: string, programId: string | null, userId: string): Promise<boolean>;
    assign(input: {
        submissionId: string;
        evaluatorUserId: string;
        evaluationFormId?: string | null;
        assessmentFormatVersionId?: string | null;
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
