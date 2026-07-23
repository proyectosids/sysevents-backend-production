"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentQuoteQuerySchema = exports.createPaymentOrderSchema = exports.paymentOrderParamsSchema = exports.paymentEventParamsSchema = void 0;
const zod_1 = require("zod");
exports.paymentEventParamsSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
});
exports.paymentOrderParamsSchema = exports.paymentEventParamsSchema.extend({
    orderId: zod_1.z.string().uuid(),
});
exports.createPaymentOrderSchema = zod_1.z.object({
    registrationId: zod_1.z.string().uuid(),
    registrationTypeId: zod_1.z.string().uuid().optional(),
    addonSelections: zod_1.z.array(zod_1.z.object({
        addonId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().positive().max(20).default(1),
    })).optional(),
    displayCurrency: zod_1.z.string().length(3).optional(),
    provider: zod_1.z.enum(['stripe', 'mercadopago', 'openpay']).default('stripe'),
});
exports.paymentQuoteQuerySchema = zod_1.z.object({
    amountCents: zod_1.z.coerce.number().int().positive(),
    baseCurrency: zod_1.z.string().length(3),
    quoteCurrency: zod_1.z.string().length(3),
});
//# sourceMappingURL=payment.schemas.js.map