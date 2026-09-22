"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenpayPaymentService = void 0;
const env_1 = require("../../../../config/env");
const app_error_1 = require("../../../../shared/errors/app-error");
const events_repository_1 = require("../../../events/infrastructure/repositories/events.repository");
const registrations_repository_1 = require("../../../registrations/infrastructure/repositories/registrations.repository");
const site_data_repository_1 = require("../../../site-data/infrastructure/repositories/site-data.repository");
const payments_repository_1 = require("../../infrastructure/repositories/payments.repository");
const pricing_service_1 = require("./pricing.service");
class OpenpayPaymentService {
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
        const settings = await this.siteDataRepository.findActivePaymentSettings(eventId, 'openpay');
        const merchantId = settings?.publicKey?.trim();
        const privateKey = settings?.secretKey?.trim();
        if (!settings || !merchantId || !privateKey)
            throw new app_error_1.AppError('El organizador del evento aún no ha configurado Openpay BBVA.', 503, 'EVENT_PAYMENT_PROVIDER_NOT_CONFIGURED');
        const paidOrder = await this.paymentsRepository.findLatestOrder(registrationId, 'openpay', ['paid']);
        if (paidOrder)
            throw new app_error_1.AppError('Payment has already been completed', 409, 'PAYMENT_ALREADY_COMPLETED');
        const openOrder = await this.paymentsRepository.findLatestOrder(registrationId, 'openpay', ['created', 'pending']);
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
            provider: 'openpay',
            eventId,
            registrationId,
            userId,
            amountCents: registration.amountCents,
            currency: registration.currency,
            metadata: { pricingQuote: await this.createPricingQuote(registration.amountCents, registration.currency, selection?.displayCurrency) },
        });
        if (!order)
            throw new app_error_1.AppError('Openpay provider is not active', 503, 'PAYMENT_PROVIDER_NOT_CONFIGURED');
        const configuredApiUrl = typeof settings.openpayApiUrl === 'string'
            ? settings.openpayApiUrl.trim()
            : '';
        const baseUrl = normalizeOpenpayApiUrl(configuredApiUrl || (settings.mode === 'test' ? 'https://sandbox-api.openpay.mx/v1' : 'https://api.openpay.mx/v1'));
        const customerEmail = firstNonEmpty(registration.email, selection?.userEmail);
        if (!customerEmail) {
            throw new app_error_1.AppError('No se encontro un correo electronico valido para crear el pago.', 400, 'PAYMENT_CUSTOMER_EMAIL_REQUIRED');
        }
        const customerName = firstNonEmpty(registration.firstName, registration.email, selection?.userEmail, 'Participante');
        const response = await fetch(`${baseUrl}/${encodeURIComponent(merchantId)}/charges`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: 'card',
                amount: Number((registration.amountCents / 100).toFixed(2)),
                currency: registration.currency,
                description: `${event.name} registration`,
                order_id: order.id,
                confirm: false,
                send_email: false,
                redirect_url: `${env_1.env.APP_PUBLIC_URL}/payments/success?orderId=${order.id}`,
                customer: {
                    name: customerName,
                    last_name: registration.lastName ?? '',
                    phone_number: registration.phone ?? '',
                    email: customerEmail,
                },
            }),
        });
        const charge = await response.json();
        const checkoutUrl = charge.payment_method?.url ?? null;
        if (!response.ok || !charge.id || !checkoutUrl) {
            throw new app_error_1.AppError(charge.error_message || charge.description || 'Openpay rejected the charge', 502, 'PAYMENT_PROVIDER_ERROR');
        }
        return this.paymentsRepository.updateOrderProviderData(order.id, charge.id, checkoutUrl);
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
        const eventType = String(payload?.type ?? '');
        const transaction = extractOpenpayTransaction(payload);
        const providerEventId = firstNonEmpty(payload?.id, transaction?.id, payload?.event_date, `${eventType || 'openpay'}-${Date.now()}`);
        if (eventType) {
            const inserted = await this.paymentsRepository.saveWebhookEvent({
                provider: 'openpay',
                providerEventId,
                eventType,
                payload,
            });
            if (!inserted)
                return { received: true, duplicate: true };
        }
        const transactionStatus = firstNonEmpty(transaction?.status, payload?.status);
        if (isOpenpayPaidEvent(eventType) || isOpenpayPaidStatus(transactionStatus)) {
            const orderId = firstNonEmpty(transaction?.order_id, transaction?.orderId, transaction?.order, payload?.order_id, payload?.orderId);
            const providerOrderId = firstNonEmpty(transaction?.id, payload?.transaction_id);
            const order = orderId
                ? await this.paymentsRepository.findOrderById(orderId)
                : providerOrderId
                    ? await this.paymentsRepository.findOrderByProviderOrderId(providerOrderId)
                    : null;
            if (order && order.status !== 'paid') {
                await this.paymentsRepository.markOrderPaid(order.id, providerOrderId ?? null, payload);
                if (eventType)
                    await this.paymentsRepository.markWebhookProcessed('openpay', providerEventId);
            }
        }
        return {
            received: true,
            provider: 'openpay',
            eventType: eventType || null,
            verificationCode: payload?.verification_code ?? null,
        };
    }
    async reconcileOrder(orderId, userId) {
        const order = await this.paymentsRepository.findOrderById(orderId);
        if (!order || order.userId !== userId)
            throw new app_error_1.AppError('Payment order not found', 404, 'PAYMENT_ORDER_NOT_FOUND');
        if (order.provider !== 'openpay' || order.status === 'paid' || !order.providerOrderId)
            return order;
        const { merchantId, privateKey, baseUrl } = await this.getOpenpaySettings(order.eventId);
        const response = await fetch(`${baseUrl}/${encodeURIComponent(merchantId)}/charges/${encodeURIComponent(order.providerOrderId)}`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
        });
        const charge = await response.json();
        if (!response.ok) {
            throw new app_error_1.AppError(charge.error_message || charge.description || 'Openpay rejected the status lookup', 502, 'PAYMENT_PROVIDER_ERROR');
        }
        if (isOpenpayPaidStatus(charge.status)) {
            return this.paymentsRepository.markOrderPaid(order.id, charge.id ?? order.providerOrderId, charge);
        }
        return this.paymentsRepository.findOrderById(order.id);
    }
    async getOpenpaySettings(eventId) {
        const settings = await this.siteDataRepository.findActivePaymentSettings(eventId, 'openpay');
        const merchantId = settings?.publicKey?.trim();
        const privateKey = settings?.secretKey?.trim();
        if (!settings || !merchantId || !privateKey)
            throw new app_error_1.AppError('El organizador del evento aun no ha configurado Openpay BBVA.', 503, 'EVENT_PAYMENT_PROVIDER_NOT_CONFIGURED');
        const configuredApiUrl = typeof settings.openpayApiUrl === 'string' ? settings.openpayApiUrl.trim() : '';
        const baseUrl = normalizeOpenpayApiUrl(configuredApiUrl || (settings.mode === 'test' ? 'https://sandbox-api.openpay.mx/v1' : 'https://api.openpay.mx/v1'));
        return { merchantId, privateKey, baseUrl };
    }
}
exports.OpenpayPaymentService = OpenpayPaymentService;
function normalizeOpenpayApiUrl(value) {
    const clean = value.replace(/\/+$/, '').replace(/\/v1\/v1$/i, '/v1');
    return clean.toLowerCase().endsWith('/v1') ? clean : `${clean}/v1`;
}
function extractOpenpayTransaction(payload) {
    return payload?.transaction ?? payload?.charge ?? payload?.data?.object ?? payload?.data ?? {};
}
function isOpenpayPaidEvent(eventType) {
    const normalized = eventType.toLowerCase().replace(/_/g, '.');
    return ['charge.succeeded', 'charge.completed', 'charge.paid', 'charge.captured', 'payment.completed'].includes(normalized);
}
function isOpenpayPaidStatus(status) {
    const normalized = String(status ?? '').toLowerCase();
    return ['completed', 'paid', 'succeeded', 'charge.completed', 'charge.succeeded'].includes(normalized);
}
function firstNonEmpty(...values) {
    return values
        .map((value) => (typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()))
        .find((value) => Boolean(value));
}
//# sourceMappingURL=openpay-payment.service.js.map