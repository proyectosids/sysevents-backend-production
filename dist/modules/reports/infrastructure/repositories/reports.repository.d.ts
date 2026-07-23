import sql from 'mssql';
export type ReportDimension = 'program' | 'knowledgeArea' | 'knowledgeLine' | 'registrationType' | 'registrationStatus' | 'participationMode' | 'institution' | 'country' | 'submissionType' | 'submissionStatus';
type ReportConfig = {
    groupBy: ReportDimension[];
    filters: Partial<Record<ReportDimension, string[]>>;
};
type ProgramScope = {
    restricted: boolean;
    programs: Array<{
        id: string;
        name: string;
    }>;
};
export declare class ReportsRepository {
    getScope(eventId: string, userId: string, canViewAllPrograms: boolean): Promise<ProgramScope>;
    getSummary(eventId: string, scope: ProgramScope): Promise<any>;
    getContext(eventId: string, scope: ProgramScope): Promise<{
        scope: ProgramScope;
        options: {
            programs: {
                id: string;
                name: string;
            }[];
            areas: never[] | sql.IRecordSet<Record<string, unknown>>;
            lines: never[] | sql.IRecordSet<Record<string, unknown>>;
            registrationTypes: never[] | sql.IRecordSet<Record<string, unknown>>;
            institutions: never[] | sql.IRecordSet<Record<string, unknown>>;
            countries: never[] | sql.IRecordSet<Record<string, unknown>>;
            submissionTypes: never[] | sql.IRecordSet<Record<string, unknown>>;
        };
    }>;
    runDynamicReport(eventId: string, scope: ProgramScope, config: ReportConfig, includeDetails: boolean): Promise<{
        groupBy: ReportDimension[];
        groups: sql.IRecordSet<any>;
        details: unknown[];
        detailLimit: number;
    }>;
    listDefinitions(eventId: string, ownerUserId: string): Promise<any[]>;
    createDefinition(eventId: string, ownerUserId: string, name: string, config: ReportConfig): Promise<any>;
    updateDefinition(eventId: string, ownerUserId: string, definitionId: string, name: string, config: ReportConfig): Promise<any>;
    deleteDefinition(eventId: string, ownerUserId: string, definitionId: string): Promise<boolean>;
    private scopeClause;
}
export {};
