import sql from 'mssql';
import { Submission, SubmissionStatus } from '../../domain/entities/submission';
export declare class SubmissionsRepository {
    listSubmissionTypes(eventId: string, programId?: string | null): Promise<sql.IRecordSet<any>>;
    createSubmissionType(eventId: string, input: {
        programId?: string | null;
        name: string;
        description?: string;
        requiresFile?: boolean;
    }): Promise<any>;
    deactivateSubmissionType(eventId: string, typeId: string): Promise<boolean>;
    findSubmissionType(eventId: string, submissionTypeId: string): Promise<{
        id: string;
        program_id: string | null;
        requires_file: boolean;
        is_active: boolean;
    }>;
    createSubmission(input: {
        eventId: string;
        submissionTypeId: string;
        registrationId?: string | null;
        knowledgeAreaId?: string | null;
        knowledgeLineId?: string | null;
        ownerUserId: string;
        title: string;
        abstract?: string;
        videoUrl?: string | null;
        keywords?: string;
        authors: Array<{
            fullName: string;
            email: string;
            affiliation?: string;
            isCorresponding?: boolean;
        }>;
    }): Promise<Submission>;
    findById(id: string): Promise<Submission | null>;
    listMine(userId: string): Promise<Submission[]>;
    listByEvent(eventId: string, filters?: {
        programId?: string | null;
        status?: string | null;
        submissionTypeId?: string | null;
        leaderUserId?: string | null;
    }): Promise<Submission[]>;
    updateSubmission(id: string, input: {
        title?: string;
        knowledgeAreaId?: string | null;
        knowledgeLineId?: string | null;
        abstract?: string | null;
        videoUrl?: string | null;
        keywords?: string | null;
    }): Promise<Submission | null>;
    attachFile(submissionId: string, fileId: string, fileRole?: string, uploadedBy?: string): Promise<void>;
    listFiles(submissionId: string): Promise<sql.IRecordSet<any>>;
    submit(id: string, changedBy: string, resubmission?: boolean): Promise<Submission | null>;
    setStatus(id: string, status: SubmissionStatus, changedBy: string, reason: string): Promise<Submission | null>;
    deleteDraft(id: string, ownerUserId: string): Promise<boolean>;
    private validateKnowledgeSelection;
}
