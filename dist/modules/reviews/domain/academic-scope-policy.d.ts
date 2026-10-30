export type AcademicScope = {
    eventId: string;
    programId: string | null;
    role: string;
};
export type AssessmentFormatScope = {
    programId?: string | null;
};
export declare function canReadProgram(scopes: AcademicScope[], eventId: string, programId: string | null): boolean;
export declare function canReadAssessmentFormat(scopes: AcademicScope[], eventId: string, formatScopes: AssessmentFormatScope[]): boolean;
export declare function canManageAssessmentFormat(scopes: AcademicScope[], eventId: string, formatScopes: AssessmentFormatScope[]): boolean;
