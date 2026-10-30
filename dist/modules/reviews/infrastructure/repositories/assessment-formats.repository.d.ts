import sql from 'mssql';
import { AssessmentDefinition } from '../../domain/assessment-engine';
export declare class AssessmentFormatsRepository {
    scopes(eventId: string, formatId: string): Promise<sql.IRecordSet<{
        programId: string | null;
        submissionTypeId: string | null;
    }>>;
    list(eventId: string): Promise<any[]>;
    versions(eventId: string, formatId: string): Promise<any[]>;
    create(input: {
        eventId: string;
        name: string;
        purpose: string;
        instructions?: string | null;
        scopes: Array<{
            programId?: string | null;
            submissionTypeId?: string | null;
        }>;
        definition: AssessmentDefinition;
        printableTemplateFileId?: string | null;
        userId: string;
    }): Promise<{
        id: string;
        versionId: string;
    }>;
    private replaceScopes;
    updateDraft(input: {
        eventId: string;
        formatId: string;
        name?: string;
        instructions?: string | null;
        scopes?: Array<{
            programId?: string | null;
            submissionTypeId?: string | null;
        }>;
        definition?: AssessmentDefinition;
        printableTemplateFileId?: string | null;
        userId: string;
    }): Promise<{
        formatId: string;
        versionId: string;
    }>;
    publish(eventId: string, formatId: string, versionId: string, userId: string): Promise<{
        formatId: string;
        versionId: string;
    }>;
    archive(eventId: string, formatId: string): Promise<boolean>;
    remove(eventId: string, formatId: string): Promise<boolean>;
    duplicate(eventId: string, formatId: string, userId: string): Promise<{
        id: string;
        versionId: string;
    }>;
    eligibleVersions(eventId: string, purpose: string, programId?: string | null, submissionTypeId?: string | null): Promise<sql.IRecordSet<any>>;
    workspace(kind: 'review' | 'evaluation', assignmentId: string, userId: string): Promise<any>;
    saveResponse(input: {
        kind: 'review' | 'evaluation';
        assignmentId: string;
        userId: string;
        answers: Record<string, unknown>;
        comments?: string | null;
        proposedDecision?: string | null;
        submit: boolean;
    }): Promise<{
        status: string;
        calculated: Record<string, number>;
        recommendation: string | null;
        errors: string[];
        responseId: string;
    }>;
}
