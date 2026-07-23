import { z } from 'zod';
export declare const paymentEventParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
}, z.core.$strip>;
export declare const paymentOrderParamsSchema: z.ZodObject<{
    eventId: z.ZodString;
    orderId: z.ZodString;
}, z.core.$strip>;
export declare const createPaymentOrderSchema: z.ZodObject<{
    registrationId: z.ZodString;
    registrationTypeId: z.ZodOptional<z.ZodString>;
    addonSelections: z.ZodOptional<z.ZodArray<z.ZodObject<{
        addonId: z.ZodString;
        quantity: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>>;
    displayCurrency: z.ZodOptional<z.ZodString>;
    provider: z.ZodDefault<z.ZodEnum<{
        stripe: "stripe";
        mercadopago: "mercadopago";
        openpay: "openpay";
    }>>;
}, z.core.$strip>;
export declare const paymentQuoteQuerySchema: z.ZodObject<{
    amountCents: z.ZodCoercedNumber<unknown>;
    baseCurrency: z.ZodString;
    quoteCurrency: z.ZodString;
}, z.core.$strip>;
