"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canReadProgram = canReadProgram;
exports.canReadAssessmentFormat = canReadAssessmentFormat;
exports.canManageAssessmentFormat = canManageAssessmentFormat;
function canReadProgram(scopes, eventId, programId) {
    return scopes.some((scope) => scope.eventId === eventId && (scope.programId === null
        || (programId !== null && scope.programId === programId)));
}
function canReadAssessmentFormat(scopes, eventId, formatScopes) {
    const normalized = formatScopes.length ? formatScopes : [{ programId: null }];
    return normalized.some((scope) => {
        const programId = scope.programId ?? null;
        if (programId === null)
            return scopes.some((candidate) => candidate.eventId === eventId);
        return canReadProgram(scopes, eventId, programId);
    });
}
function canManageAssessmentFormat(scopes, eventId, formatScopes) {
    const supervisors = scopes.filter((scope) => scope.eventId === eventId && scope.role === 'supervisor');
    if (!supervisors.length)
        return false;
    if (supervisors.some((scope) => scope.programId === null))
        return true;
    const normalized = formatScopes.length ? formatScopes : [{ programId: null }];
    return normalized.every((scope) => {
        const programId = scope.programId ?? null;
        return programId !== null && supervisors.some((candidate) => candidate.programId === programId);
    });
}
//# sourceMappingURL=academic-scope-policy.js.map