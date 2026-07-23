import type { PaymentOrder, PaymentProviderName } from '../../domain/entities/payment';
export declare class PaymentsRepository {
    findLatestOrder(registrationId: string, provider: PaymentProviderName, statuses: Array<'created' | 'pending' | 'paid' | 'failed' | 'cancelled'>): Promise<PaymentOrder | null>;
    cancelOrder(orderId: string): Promise<void>;
    restoreRegistrationPaymentPending(registrationId: string, presenter: boolean): Promise<void>;
    createOrder(input: {
        provider: PaymentProviderName;
        eventId: string;
        registrationId: string;
        userId?: string | null;
        amountCents: number;
        currency: string;
        metadata?: unknown;
    }): Promise<PaymentOrder | null>;
    updateOrderProviderData(orderId: string, providerOrderId: string, checkoutUrl: string | null): Promise<PaymentOrder | null>;
    findOrderByProviderOrderId(providerOrderId: string): Promise<PaymentOrder | null>;
    findOrderById(orderId: string): Promise<PaymentOrder | null>;
    markOrderPaid(orderId: string, providerTransactionId: string | null, payload: unknown): Promise<PaymentOrder>;
    saveWebhookEvent(input: {
        provider: string;
        providerEventId: string;
        eventType: string;
        payload: unknown;
    }): Promise<boolean>;
    markWebhookProcessed(provider: string, providerEventId: string): Promise<void>;
    listMyPayments(userId: string): Promise<PaymentOrder[]>;
    listEventPayments(eventId: string): Promise<PaymentOrder[]>;
}
