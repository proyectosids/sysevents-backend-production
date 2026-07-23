export declare class OpenpayPaymentService {
    private readonly paymentsRepository;
    private readonly registrationsRepository;
    private readonly eventsRepository;
    private readonly siteDataRepository;
    private readonly pricingService;
    createCheckoutOrder(eventId: string, registrationId: string, userId: string, selection?: {
        registrationTypeId?: string;
        addonSelections?: Array<{
            addonId: string;
            quantity: number;
        }>;
        displayCurrency?: string;
        userEmail?: string;
    }): Promise<import("../../domain/entities/payment").PaymentOrder | null>;
    private createPricingQuote;
    handleWebhook(payload: any): Promise<{
        received: boolean;
        duplicate: boolean;
        provider?: undefined;
        eventType?: undefined;
        verificationCode?: undefined;
    } | {
        received: boolean;
        provider: string;
        eventType: string | null;
        verificationCode: any;
        duplicate?: undefined;
    }>;
    reconcileOrder(orderId: string, userId: string): Promise<import("../../domain/entities/payment").PaymentOrder | null>;
    private getOpenpaySettings;
}
