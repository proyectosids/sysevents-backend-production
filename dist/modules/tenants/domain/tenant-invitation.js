"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantInvitationStatus = tenantInvitationStatus;
exports.invitationEmailMatches = invitationEmailMatches;
function tenantInvitationStatus(invitation, now = new Date()) {
    if (invitation.revokedAt)
        return 'revoked';
    if (invitation.acceptedAt)
        return 'accepted';
    if (invitation.expiresAt <= now)
        return 'expired';
    return 'pending';
}
function invitationEmailMatches(invitedEmail, candidateEmail) {
    return invitedEmail.trim().toLowerCase() === candidateEmail.trim().toLowerCase();
}
//# sourceMappingURL=tenant-invitation.js.map