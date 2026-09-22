"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripePaymentService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const env_1 = require("../../../../config/env");
const app_error_1 = require("../../../../shared/errors/app-error");
const events_repository_1 = require("../../../events/infrastructure/repositories/events.repository");
const registrations_repository_1 = require("../../../registrations/infrastructure/repositories/registrations.repository");
const site_data_repository_1 = require("../../../site-data/infrastructure/repositories/site-data.repository");
const payments_repository_1 = require("../../infrastructure/repositories/payments.repository");
const pricing_service_1 = require("./pricing.service");
class StripePaymentService {
    paymentsRepository = new payments_repository_1.PaymentsRepository();
    registrationsRepository = new registrations_repository_1.RegistrationsRepository();
    eventsRepository = new events_repository_1.EventsRepository();
    siteDataRepository = new site_data_repository_1.SiteDataRepository();
    pricingService = new pricing_service_1.PricingService();
    getStripe(secretKey) {
        if (!secretKey) {
            throw new app_error_1.AppError('Stripe is not configured', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
        }
        return new stripe_1.default(secretKey);
    }
    async getStripeSettings(eventId) {
        return this.siteDataRepository.findActivePaymentSettings(eventId, 'stripe');
    }
    async createCheckoutOrder(eventId, registrationId, userId, selection) {
        const event = await this.eventsRepository.findEventById(eventId);
        if (!event) {
            throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
        }
        let registration = await this.registrationsRepository.findEventRegistration(eventId, registrationId);
        if (!registration) {
            throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
        }
        if (registration.userId !== userId) {
            throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
        }
        const paymentPolicy = await this.paymentsRepository.getEventPaymentPolicy(eventId);
        if (paymentPolicy === 'free') {
            throw new app_error_1.AppError('Este evento está configurado sin cobro.', 409, 'REGISTRATION_PAYMENT_NOT_REQUIRED');
        }
        if (registration.participationMode !== 'attendee' && !(await this.paymentsRepository.hasAcceptedSubmission(registrationId))) {
            throw new app_error_1.AppError('El pago se habilita cuando el trabajo ha sido aprobado.', 409, 'SUBMISSION_APPROVAL_REQUIRED');
        }
        if (selection?.registrationTypeId) {
            const updated = await this.registrationsRepository.applyPaymentSelection(eventId, registrationId, userId ?? registration.userId ?? '', {
                registrationTypeId: selection.registrationTypeId,
                addonSelections: selection.addonSelections,
            });
            if (updated)
                registration = updated;
        }
        if (registration.amountCents <= 0) {
            throw new app_error_1.AppError('No hay un importe pendiente para este registro.', 409, 'REGISTRATION_PAYMENT_NOT_REQUIRED');
        }
        const paidOrder = await this.paymentsRepository.findLatestOrder(registrationId, 'stripe', ['paid']);
        if (paidOrder)
            throw new app_error_1.AppError('Payment has already been completed', 409, 'PAYMENT_ALREADY_COMPLETED');
        const settings = await this.getStripeSettings(eventId);
        if (!settings?.secretKey || !settings.webhookSecret) {
            throw new app_error_1.AppError('El organizador del evento aún no ha configurado Stripe.', 503, 'EVENT_PAYMENT_PROVIDER_NOT_CONFIGURED');
        }
        const stripe = this.getStripe(settings?.secretKey);
        const openOrder = await this.paymentsRepository.findLatestOrder(registrationId, 'stripe', ['created', 'pending']);
        if (openOrder?.status === 'pending' && openOrder.providerOrderId) {
            try {
                const existingSession = await stripe.checkout.sessions.retrieve(openOrder.providerOrderId);
                if (existingSession.payment_status === 'paid') {
                    await this.paymentsRepository.markOrderPaid(openOrder.id, existingSession.payment_intent?.toString() ?? existingSession.id, existingSession);
                    return { ...openOrder, status: 'paid', checkoutUrl: null };
                }
                if (existingSession.status === 'open' && existingSession.expires_at * 1000 > Date.now() && openOrder.checkoutUrl)
                    return openOrder;
            }
            catch {
                // The provider session no longer exists; replace the local pending order.
            }
            await this.paymentsRepository.cancelOrder(openOrder.id);
        }
        else if (openOrder) {
            await this.paymentsRepository.cancelOrder(openOrder.id);
        }
        if (registration.status === 'confirmed') {
            await this.paymentsRepository.restoreRegistrationPaymentPending(registrationId, registration.participationMode !== 'attendee');
        }
        else if (!['pending_payment', 'accepted_pending_payment'].includes(registration.status)) {
            throw new app_error_1.AppError('Payment is not available for this registration', 409, 'REGISTRATION_PAYMENT_NOT_REQUIRED');
        }
        if (registration.participationMode !== 'attendee' && !['accepted_pending_payment', 'confirmed'].includes(registration.status)) {
            throw new app_error_1.AppError('El pago se habilita cuando el trabajo ha sido aprobado.', 409, 'SUBMISSION_APPROVAL_REQUIRED');
        }
        const order = await this.paymentsRepository.createOrder({
            provider: 'stripe',
            eventId,
            registrationId,
            userId: userId ?? registration.userId,
            amountCents: registration.amountCents,
            currency: registration.currency,
            metadata: { pricingQuote: await this.createPricingQuote(registration.amountCents, registration.currency, selection?.displayCurrency) },
        });
        if (!order) {
            throw new app_error_1.AppError('Stripe provider is not active', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
        }
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            adaptive_pricing: { enabled: true },
            success_url: `${env_1.env.APP_PUBLIC_URL}/payments/success?orderId=${order.id}`,
            cancel_url: `${env_1.env.APP_PUBLIC_URL}/payments/cancel?orderId=${order.id}`,
            client_reference_id: order.id,
            metadata: {
                orderId: order.id,
                eventId,
                registrationId,
            },
            customer_email: firstNonEmpty(registration.email, selection?.userEmail),
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: registration.currency.toLowerCase(),
                        unit_amount: registration.amountCents,
                        product_data: {
                            name: `${event.name} registration`,
                            description: `Registration ${registration.id}`,
                        },
                    },
                },
            ],
        });
        const updatedOrder = await this.paymentsRepository.updateOrderProviderData(order.id, session.id, session.url);
        return updatedOrder;
    }
    async createPricingQuote(amountCents, currency, displayCurrency) {
        try {
            return await this.pricingService.createQuote(amountCents, currency, displayCurrency);
        }
        catch {
            return null;
        }
    }
    async handleWebhook(rawBody, signature) {
        if (!signature || Array.isArray(signature)) {
            throw new app_error_1.AppError('Invalid Stripe webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
        }
        let event;
        const eventSettings = await this.siteDataRepository.listActivePaymentSettings('stripe');
        const candidates = [
            ...eventSettings
                .filter((settings) => settings.secretKey && settings.webhookSecret)
                .map((settings) => ({ secretKey: settings.secretKey, webhookSecret: settings.webhookSecret })),
        ].filter((item) => Boolean(item));
        if (!candidates.length) {
            throw new app_error_1.AppError('Stripe webhook is not configured', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
        }
        for (const candidate of candidates) {
            try {
                const stripe = this.getStripe(candidate.secretKey);
                event = stripe.webhooks.constructEvent(rawBody, signature, candidate.webhookSecret);
                break;
            }
            catch {
                event = null;
            }
        }
        if (!event) {
            throw new app_error_1.AppError('Invalid Stripe webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
        }
        const inserted = await this.paymentsRepository.saveWebhookEvent({
            provider: 'stripe',
            providerEventId: event.id,
            eventType: event.type,
            payload: event,
        });
        if (!inserted) {
            return { received: true, duplicate: true };
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const order = await this.paymentsRepository.findOrderByProviderOrderId(session.id);
            if (order) {
                await this.paymentsRepository.markOrderPaid(order.id, session.payment_intent?.toString() ?? session.id, session);
            }
        }
        await this.paymentsRepository.markWebhookProcessed('stripe', event.id);
        return { received: true, duplicate: false };
    }
}
exports.StripePaymentService = StripePaymentService;
function firstNonEmpty(...values) {
    return values.map((value) => value?.trim()).find((value) => Boolean(value));
}
//# sourceMappingURL=stripe-payment.service.js.map