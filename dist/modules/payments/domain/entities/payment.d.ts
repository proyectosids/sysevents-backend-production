export type PaymentProviderName = 'stripe' | 'mercadopago' | 'openpay';
export type PaymentOrderStatus = 'created' | 'pending' | 'paid' | 'failed' | 'cancelled';
export type PaymentOrder = {
    id: string;
    provider: PaymentProviderName;
    eventId: string;
    registrationId: string;
    userId: string | null;
    amountCents: number;
    currency: string;
    status: PaymentOrderStatus;
    providerOrderId: string | null;
    checkoutUrl: string | null;
    eventName?: string;
    createdAt?: Date;
};
