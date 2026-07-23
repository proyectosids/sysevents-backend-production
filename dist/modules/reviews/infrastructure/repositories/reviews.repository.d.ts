import sql from 'mssql';
export declare class ReviewsRepository {
    listProgramReviewTeams(eventId: string): Promise<{
        programId: string;
        programName: string;
        leader: null | {
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
    saveProgramReviewTeam(input: {
        eventId: string;
        programId: string;
        leaderUserId: string;
        reviewerUserIds: string[];
        changedBy: string;
    }): Promise<boolean>;
    isProgramLeader(submissionId: string, userId: string): Promise<boolean>;
    isProgramReviewer(submissionId: string, userId: string): Promise<boolean>;
    isReviewerInSubmissionTeam(submissionId: string, reviewerUserId: string): Promise<boolean>;
    findProgramLeader(submissionId: string): Promise<{
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
    }>;
    allAssignedReviewsSubmitted(submissionId: string): Promise<boolean>;
    assignReviewer(input: {
        submissionId: string;
        reviewerUserId: string;
        assignedBy: string;
        rubricId?: string;
        dueAt?: Date;
    }): Promise<any>;
    findReviewerAssignment(submissionId: string, reviewerUserId: string): Promise<{
        id: string;
        status: string;
    }>;
    deletePendingAssignment(assignmentId: string): Promise<boolean>;
    listMyReviews(reviewerUserId: string): Promise<sql.IRecordSet<any>>;
    listSubmissionReviews(submissionId: string): Promise<sql.IRecordSet<any>>;
    getParticipantFeedback(submissionId: string, ownerUserId: string): Promise<{
        comments: sql.IRecordSet<any>;
        reviews: sql.IRecordSet<any>;
    } | null>;
    findReview(id: string): Promise<any>;
    getReviewWorkspace(assignmentId: string, reviewerUserId: string): Promise<any>;
    getReviewAuditWorkspace(assignmentId: string): Promise<any>;
    addFileComment(input: {
        assignmentId: string;
        reviewerUserId: string;
        fileId: string;
        pageNumber?: number | null;
        sectionLabel?: string | null;
        selectedText?: string | null;
        anchor?: Record<string, string | number | boolean | null> | null;
        comment: string;
    }): Promise<any>;
    updateFileComment(input: {
        assignmentId: string;
        reviewerUserId: string;
        commentId: string;
        comment: string;
    }): Promise<any>;
    deleteFileComment(input: {
        assignmentId: string;
        reviewerUserId: string;
        commentId: string;
    }): Promise<boolean>;
    submitReview(input: {
        assignmentId: string;
        reviewerUserId: string;
        recommendation: string;
        comments?: string;
        score?: number;
    }): Promise<any>;
    createDecision(input: {
        submissionId: string;
        decision: 'accepted' | 'accepted_with_observations' | 'requires_corrections' | 'rejected' | 'changes_requested';
        notes?: string;
        decidedBy: string;
    }): Promise<any>;
}
