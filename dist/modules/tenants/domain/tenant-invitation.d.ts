export type TenantInvitationLifecycle = {
    acceptedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
};
export type TenantInvitationLifecycleStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export declare function tenantInvitationStatus(invitation: TenantInvitationLifecycle, now?: Date): TenantInvitationLifecycleStatus;
export declare function invitationEmailMatches(invitedEmail: string, candidateEmail: string): boolean;
