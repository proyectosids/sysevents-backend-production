import { Tenant, TenantStatus, TenantUser } from '../../domain/entities/tenant';
export declare class TenantsRepository {
    listTenants(): Promise<Tenant[]>;
    listTenantsForUser(userId: string): Promise<Tenant[]>;
    createTenant(input: {
        name: string;
        slug?: string;
        status?: TenantStatus;
    }): Promise<Tenant>;
    tenantSlugExists(slug: string, excludeId?: string): Promise<boolean>;
    findTenantById(id: string): Promise<Tenant | null>;
    updateTenant(id: string, input: Partial<Pick<Tenant, 'name' | 'slug' | 'status'>>): Promise<Tenant | null>;
    addUserToTenant(input: {
        tenantId: string;
        userId: string;
        tenantRole: string;
    }): Promise<void>;
    findTenantUser(tenantId: string, userId: string): Promise<{
        tenantId: string;
        userId: string;
        tenantRole: string;
    } | null>;
    listTenantUsers(tenantId: string): Promise<(TenantUser & {
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        accessStatus: "active" | "pending" | "expired";
    })[]>;
    countTenantUsers(tenantId: string): Promise<number>;
    countTenantsForUser(userId: string): Promise<number>;
    tenantNameExistsForUser(userId: string, name: string): Promise<boolean>;
    countAdminTenantUsers(tenantId: string): Promise<number>;
    countTenantUsersByRoles(tenantId: string, roles: string[]): Promise<number>;
    userHasTenantRole(userId: string, roles: string[]): Promise<boolean>;
    removeUserFromTenant(tenantId: string, userId: string): Promise<boolean>;
    createInvitation(input: {
        tenantId: string;
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        createdBy?: string | null;
    }): Promise<void>;
    findInvitationByTokenHash(tokenHash: string): Promise<{
        id: string;
        tenantId: string;
        tenantName: string;
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        tenantRole: string;
        expiresAt: Date;
        acceptedAt: Date | null;
        revokedAt: Date | null;
    } | null>;
    acceptInvitation(id: string): Promise<void>;
}
