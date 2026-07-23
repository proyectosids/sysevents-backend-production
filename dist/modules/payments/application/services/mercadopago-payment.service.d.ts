export declare class MercadoPagoPaymentService {
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
    }): Promise<import("../../domain/entities/payment").PaymentOrder | null>;
    private createPricingQuote;
    handleWebhook(payload: any): Promise<{
        received: boolean;
        ignored: boolean;
    } | {
        received: boolean;
        ignored?: undefined;
    }>;
}
