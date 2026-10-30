import sql from 'mssql';
export type AcademicScopeRole = 'supervisor' | 'leader' | 'reviewer' | 'evaluator';
export declare class AcademicWorkflowRepository {
    listMyScopes(userId: string): Promise<sql.IRecordSet<any>>;
    getLeaderDashboard(eventId: string, userId: string): Promise<{
        eventId: string;
        eventName: string;
        programs: {
            teamId: string;
            teamName: string;
            programId: string;
            programName: string;
            eventName: string;
            reviewers: Array<Record<string, unknown>>;
        }[];
        submissions: {
            id: string;
            title: string;
            status: string;
            createdAt: unknown;
            programId: string;
            programName: string;
            submissionTypeId: string;
            submissionTypeName: string;
            teamId: string;
            teamName: string;
            assignments: Array<{
                id: string;
                status: string;
                dueAt: string | null;
                submittedAt: string | null;
                reviewerUserId: string;
                reviewerFirstName: string;
                reviewerLastName: string;
                reviewerEmail: string;
            }>;
        }[];
        summary: {
            totalSubmissions: number;
            unassignedSubmissions: number;
            reviewsInProgress: number;
            awaitingLeader: number;
            forwardedToSupervisor: number;
        };
    }>;
    getEventContext(eventId: string, userId: string, includeMembers: boolean, unrestrictedPrograms?: boolean): Promise<{
        event: {
            id: string;
            name: string;
            tenantId: string;
        };
        programs: sql.IRecordSet<any>;
        members: {
            academicRoles: any;
            academicRolesJson: undefined;
        }[];
    } | null>;
    hasEventAccess(eventId: string, userId: string): Promise<boolean>;
    isSupervisor(eventId: string, programId: string | null, userId: string): Promise<boolean>;
    isSupervisorForSubmission(submissionId: string, userId: string): Promise<boolean>;
    isLeaderForAssignment(assignmentId: string, userId: string): Promise<boolean>;
    isLeaderForSubmission(submissionId: string, userId: string): Promise<boolean>;
    isSupervisorForAssignment(assignmentId: string, userId: string): Promise<boolean>;
    listTeams(eventId: string, userId: string, unrestricted?: boolean): Promise<{
        teamId: string;
        teamName: string;
        programId: string;
        programName: string;
        leader: {
            userId: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        reviewers: Array<{
            userId: string;
            firstName: string;
            lastName: string;
            email: string;
        }>;
    }[]>;
    listSupervisors(eventId: string, userId: string, unrestricted?: boolean): Promise<sql.IRecordSet<any>>;
    listEvaluators(eventId: string, userId: string, unrestricted?: boolean): Promise<sql.IRecordSet<any>>;
    saveTeam(input: {
        teamId?: string;
        eventId: string;
        programId: string;
        name: string;
        leaderUserId: string;
        reviewerUserIds: string[];
        allowLeaderRoleOverride: boolean;
        allowReviewerRoleOverride: boolean;
        changedBy: string;
    }): Promise<string>;
    saveSupervisor(input: {
        eventId: string;
        programId?: string | null;
        userId: string;
        allowRoleOverride: boolean;
        assignedBy: string;
    }): Promise<void>;
    canAssignReviewer(submissionId: string, teamId: string, reviewerUserId: string, userId: string): Promise<boolean>;
    isTeamReviewerForSubmission(submissionId: string, teamId: string, reviewerUserId: string): Promise<boolean>;
    transitionReview(input: {
        assignmentId: string;
        actorId: string;
        allowedFrom: string[];
        toStatus: string;
        action: string;
        reason?: string | null;
    }): Promise<void>;
    listReviewHistory(assignmentId: string): Promise<sql.IRecordSet<any>>;
    allReviewsForwarded(submissionId: string): Promise<boolean>;
    assignmentNotificationData(assignmentId: string): Promise<{
        submissionTitle: string;
        reviewerUserId: string;
        reviewerEmail: string;
        leaderUserId: string | null;
        leaderEmail: string | null;
    }>;
    private syncWorkspaceRoles;
}
