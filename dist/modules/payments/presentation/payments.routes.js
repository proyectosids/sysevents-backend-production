"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentWebhooksRouter = exports.myPaymentsRouter = exports.paymentsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const app_error_1 = require("../../../shared/errors/app-error");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const payments_repository_1 = require("../infrastructure/repositories/payments.repository");
const stripe_payment_service_1 = require("../application/services/stripe-payment.service");
const mercadopago_payment_service_1 = require("../application/services/mercadopago-payment.service");
const openpay_payment_service_1 = require("../application/services/openpay-payment.service");
const pricing_service_1 = require("../application/services/pricing.service");
const site_data_repository_1 = require("../../site-data/infrastructure/repositories/site-data.repository");
const registrations_repository_1 = require("../../registrations/infrastructure/repositories/registrations.repository");
const payment_country_1 = require("../domain/payment-country");
const payment_schemas_1 = require("./schemas/payment.schemas");
exports.paymentsRouter = (0, express_1.Router)();
exports.myPaymentsRouter = (0, express_1.Router)();
exports.paymentWebhooksRouter = (0, express_1.Router)();
const stripePaymentService = new stripe_payment_service_1.StripePaymentService();
const mercadoPagoPaymentService = new mercadopago_payment_service_1.MercadoPagoPaymentService();
const openpayPaymentService = new openpay_payment_service_1.OpenpayPaymentService();
const paymentsRepository = new payments_repository_1.PaymentsRepository();
const siteDataRepository = new site_data_repository_1.SiteDataRepository();
const registrationsRepository = new registrations_repository_1.RegistrationsRepository();
const pricingService = new pricing_service_1.PricingService();
const paymentProvidersQuerySchema = zod_1.z.object({ registrationId: zod_1.z.string().uuid() });
exports.paymentsRouter.get('/:eventId/payments/quote', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    payment_schemas_1.paymentEventParamsSchema.parse(req.params);
    const input = payment_schemas_1.paymentQuoteQuerySchema.parse(req.query);
    const quote = await pricingService.createQuote(input.amountCents, input.baseCurrency, input.quoteCurrency);
    return (0, api_response_1.sendSuccess)(res, 'Payment quote retrieved successfully', quote);
}));
exports.paymentsRouter.get('/:eventId/payments/providers', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = payment_schemas_1.paymentEventParamsSchema.parse(req.params);
    const { registrationId } = paymentProvidersQuerySchema.parse(req.query);
    let allowMercadoPago = false;
    const registration = await registrationsRepository.findEventRegistration(eventId, registrationId);
    if (!registration || registration.userId !== req.user.id) {
        return (0, api_response_1.sendSuccess)(res, 'Event payment providers retrieved successfully', []);
    }
    allowMercadoPago = (0, payment_country_1.isMexicoCountry)(registration.country);
    const configured = await siteDataRepository.listConfiguredPaymentProviders(eventId);
    const providers = configured.filter((item) => item.provider !== 'mercadopago' || allowMercadoPago);
    return (0, api_response_1.sendSuccess)(res, 'Event payment providers retrieved successfully', providers);
}));
exports.paymentsRouter.post('/:eventId/payments/create-order', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = payment_schemas_1.paymentEventParamsSchema.parse(req.params);
    const input = payment_schemas_1.createPaymentOrderSchema.parse(req.body);
    const service = input.provider === 'mercadopago'
        ? mercadoPagoPaymentService
        : input.provider === 'openpay'
            ? openpayPaymentService
            : stripePaymentService;
    const order = await service.createCheckoutOrder(eventId, input.registrationId, req.user.id, {
        registrationTypeId: input.registrationTypeId,
        addonSelections: input.addonSelections,
        displayCurrency: input.displayCurrency,
        userEmail: req.user.email,
    });
    return (0, api_response_1.sendSuccess)(res, 'Payment order created successfully', order, 201);
}));
exports.paymentsRouter.post('/:eventId/payments/orders/:orderId/cancel', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, orderId } = payment_schemas_1.paymentOrderParamsSchema.parse(req.params);
    const order = await paymentsRepository.findOrderById(orderId);
    if (!order || order.eventId !== eventId || order.userId !== req.user.id) {
        throw new app_error_1.AppError('Payment order not found', 404, 'PAYMENT_ORDER_NOT_FOUND');
    }
    if (!['created', 'pending'].includes(order.status)) {
        throw new app_error_1.AppError('Only pending payment orders can be cancelled', 409, 'PAYMENT_ORDER_NOT_CANCELLABLE');
    }
    await paymentsRepository.cancelOrder(order.id);
    const cancelledOrder = await paymentsRepository.findOrderById(order.id);
    return (0, api_response_1.sendSuccess)(res, 'Payment order cancelled successfully', cancelledOrder);
}));
exports.paymentsRouter.post('/:eventId/payments/orders/:orderId/sync', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, orderId } = payment_schemas_1.paymentOrderParamsSchema.parse(req.params);
    const order = await paymentsRepository.findOrderById(orderId);
    if (!order || order.eventId !== eventId || order.userId !== req.user.id) {
        throw new app_error_1.AppError('Payment order not found', 404, 'PAYMENT_ORDER_NOT_FOUND');
    }
    if (order.provider !== 'openpay') {
        return (0, api_response_1.sendSuccess)(res, 'Payment order synchronized successfully', order);
    }
    const synchronizedOrder = await openpayPaymentService.reconcileOrder(order.id, req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Payment order synchronized successfully', synchronizedOrder);
}));
exports.paymentsRouter.get('/:eventId/payments', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('payments.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = payment_schemas_1.paymentEventParamsSchema.parse(req.params);
    const payments = await paymentsRepository.listEventPayments(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Event payments retrieved successfully', payments);
}));
exports.myPaymentsRouter.get('/payments', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const payments = await paymentsRepository.listMyPayments(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'My payments retrieved successfully', payments);
}));
exports.paymentWebhooksRouter.post('/stripe/webhook', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await stripePaymentService.handleWebhook(req.body, req.headers['stripe-signature']);
    return (0, api_response_1.sendSuccess)(res, 'Stripe webhook received', result);
}));
exports.paymentWebhooksRouter.post('/mercadopago/webhook', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await mercadoPagoPaymentService.handleWebhook(req.body);
    return (0, api_response_1.sendSuccess)(res, 'MercadoPago webhook received', result);
}));
exports.paymentWebhooksRouter.post('/openpay/webhook', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const result = await openpayPaymentService.handleWebhook(req.body);
    return (0, api_response_1.sendSuccess)(res, 'Openpay webhook received', result);
}));
//# sourceMappingURL=payments.routes.js.map