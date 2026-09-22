"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoPaymentService = void 0;
const env_1 = require("../../../../config/env");
const app_error_1 = require("../../../../shared/errors/app-error");
const events_repository_1 = require("../../../events/infrastructure/repositories/events.repository");
const registrations_repository_1 = require("../../../registrations/infrastructure/repositories/registrations.repository");
const site_data_repository_1 = require("../../../site-data/infrastructure/repositories/site-data.repository");
const payments_repository_1 = require("../../infrastructure/repositories/payments.repository");
const payment_country_1 = require("../../domain/payment-country");
const pricing_service_1 = require("./pricing.service");
class MercadoPagoPaymentService {
    paymentsRepository = new payments_repository_1.PaymentsRepository();
    registrationsRepository = new registrations_repository_1.RegistrationsRepository();
    eventsRepository = new events_repository_1.EventsRepository();
    siteDataRepository = new site_data_repository_1.SiteDataRepository();
    pricingService = new pricing_service_1.PricingService();
    async createCheckoutOrder(eventId, registrationId, userId, selection) {
        const event = await this.eventsRepository.findEventById(eventId);
        let registration = await this.registrationsRepository.findEventRegistration(eventId, registrationId);
        if (!event || !registration)
            throw new app_error_1.AppError('Registration not found', 404, 'REGISTRATION_NOT_FOUND');
        if (registration.userId !== userId)
            throw new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN');
        const paymentPolicy = await this.paymentsRepository.getEventPaymentPolicy(eventId);
        if (paymentPolicy === 'free')
            throw new app_error_1.AppError('Este evento está configurado sin cobro.', 409, 'REGISTRATION_PAYMENT_NOT_REQUIRED');
        if (registration.participationMode !== 'attendee' && !(await this.paymentsRepository.hasAcceptedSubmission(registrationId))) {
            throw new app_error_1.AppError('El pago se habilita cuando el trabajo ha sido aprobado.', 409, 'SUBMISSION_APPROVAL_REQUIRED');
        }
        if (selection?.registrationTypeId) {
            const updated = await this.registrationsRepository.applyPaymentSelection(eventId, registrationId, userId, {
                registrationTypeId: selection.registrationTypeId,
                addonSelections: selection.addonSelections,
            });
            if (updated)
                registration = updated;
        }
        if (registration.amountCents <= 0)
            throw new app_error_1.AppError('No hay un importe pendiente para este registro.', 409, 'REGISTRATION_PAYMENT_NOT_REQUIRED');
        if (!(0, payment_country_1.isMexicoCountry)(registration.country)) {
            throw new app_error_1.AppError('Mercado Pago solo está disponible para participantes de México. Utiliza Stripe para pagos internacionales.', 409, 'MERCADOPAGO_NOT_AVAILABLE_FOR_COUNTRY');
        }
        const settings = await this.siteDataRepository.findActivePaymentSettings(eventId, 'mercadopago');
        const accessToken = settings?.secretKey;
        if (!accessToken)
            throw new app_error_1.AppError('El organizador del evento aún no ha configurado Mercado Pago.', 503, 'EVENT_PAYMENT_PROVIDER_NOT_CONFIGURED');
        const paidOrder = await this.paymentsRepository.findLatestOrder(registrationId, 'mercadopago', ['paid']);
        if (paidOrder)
            throw new app_error_1.AppError('Payment has already been completed', 409, 'PAYMENT_ALREADY_COMPLETED');
        const openOrder = await this.paymentsRepository.findLatestOrder(registrationId, 'mercadopago', ['created', 'pending']);
        if (openOrder?.status === 'pending' && openOrder.checkoutUrl)
            return openOrder;
        if (openOrder)
            await this.paymentsRepository.cancelOrder(openOrder.id);
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
            provider: 'mercadopago', eventId, registrationId, userId,
            amountCents: registration.amountCents, currency: registration.currency,
            metadata: { pricingQuote: await this.createPricingQuote(registration.amountCents, registration.currency, selection?.displayCurrency) },
        });
        if (!order)
            throw new app_error_1.AppError('Mercado Pago provider is not active', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                external_reference: order.id,
                items: [{ title: `${event.name} registration`, quantity: 1, currency_id: registration.currency, unit_price: registration.amountCents / 100 }],
                back_urls: {
                    success: `${env_1.env.APP_PUBLIC_URL}/payments/success?orderId=${order.id}`,
                    failure: `${env_1.env.APP_PUBLIC_URL}/payments/cancel?orderId=${order.id}`,
                    pending: `${env_1.env.APP_PUBLIC_URL}/payments/success?orderId=${order.id}`,
                },
                notification_url: `${env_1.env.APP_API_URL}/api/payments/mercadopago/webhook`,
                auto_return: 'approved',
            }),
        });
        const preference = await response.json();
        if (!response.ok || !preference.id) {
            throw new app_error_1.AppError(preference.message || 'Mercado Pago rejected the preference', 502, 'PAYMENT_PROVIDER_ERROR');
        }
        return this.paymentsRepository.updateOrderProviderData(order.id, preference.id, settings?.mode === 'test' ? preference.sandbox_init_point ?? preference.init_point ?? null : preference.init_point ?? null);
    }
    async createPricingQuote(amountCents, currency, displayCurrency) {
        try {
            return await this.pricingService.createQuote(amountCents, currency, displayCurrency);
        }
        catch {
            return null;
        }
    }
    async handleWebhook(payload) {
        const paymentId = String(payload?.data?.id ?? payload?.id ?? '');
        if (!paymentId)
            return { received: true, ignored: true };
        const settings = await this.siteDataRepository.listActivePaymentSettings('mercadopago');
        const tokens = settings.map((item) => item.secretKey).filter(Boolean);
        for (const token of tokens) {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok)
                continue;
            const payment = await response.json();
            if (payment.status === 'approved' && payment.external_reference) {
                const order = await this.paymentsRepository.findOrderById(payment.external_reference);
                if (order)
                    await this.paymentsRepository.markOrderPaid(order.id, paymentId, payment);
            }
            return { received: true };
        }
        throw new app_error_1.AppError('Mercado Pago webhook could not be verified', 400, 'INVALID_WEBHOOK');
    }
}
exports.MercadoPagoPaymentService = MercadoPagoPaymentService;
//# sourceMappingURL=mercadopago-payment.service.js.map