export type TenantStatus = 'active' | 'inactive';
export type Tenant = {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    createdAt: Date;
    updatedAt: Date;
};
export type TenantUser = {
    tenantId: string;
    userId: string;
    tenantRole: string;
    createdAt: Date;
};
