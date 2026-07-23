import { z } from 'zod';
export declare const tenantIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createTenantSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        inactive: "inactive";
    }>>;
}, z.core.$strip>;
export declare const updateTenantSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        inactive: "inactive";
    }>>;
}, z.core.$strip>;
export declare const addTenantUserSchema: z.ZodObject<{
    userId: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    tenantRole: z.ZodDefault<z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        member: "member";
        reviewer: "reviewer";
    }>>;
}, z.core.$strip>;
export declare const tenantUserParamsSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export declare const updateTenantUserSchema: z.ZodObject<{
    tenantRole: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        member: "member";
        reviewer: "reviewer";
    }>;
}, z.core.$strip>;
export declare const updateTenantUserProfileSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
}, z.core.$strip>;
export declare const invitationTokenParamsSchema: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strip>;
export declare const acceptTenantInvitationSchema: z.ZodObject<{
    password: z.ZodString;
}, z.core.$strip>;
