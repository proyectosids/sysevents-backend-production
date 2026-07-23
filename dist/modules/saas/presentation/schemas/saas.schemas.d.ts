import { z } from 'zod';
export declare const onboardingSchema: z.ZodObject<{
    planId: z.ZodString;
    account: z.ZodObject<{
        firstName: z.ZodString;
        lastName: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
    organization: z.ZodObject<{
        name: z.ZodString;
        slug: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const planIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export declare const createPlanSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    priceCents: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    currency: z.ZodDefault<z.ZodString>;
    billingInterval: z.ZodDefault<z.ZodEnum<{
        monthly: "monthly";
        yearly: "yearly";
        one_time: "one_time";
    }>>;
    maxEvents: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    maxUsers: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    maxStorageMb: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    features: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    isActive: z.ZodDefault<z.ZodCoercedBoolean<unknown>>;
    sortOrder: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const updatePlanSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodOptional<z.ZodString>>>;
    priceCents: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    currency: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    billingInterval: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        monthly: "monthly";
        yearly: "yearly";
        one_time: "one_time";
    }>>>;
    maxEvents: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    maxUsers: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    maxStorageMb: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    features: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodCoercedBoolean<unknown>>>;
    sortOrder: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
}, z.core.$strip>;
export declare const contractPlanSchema: z.ZodObject<{
    tenantId: z.ZodString;
    planId: z.ZodString;
}, z.core.$strip>;
