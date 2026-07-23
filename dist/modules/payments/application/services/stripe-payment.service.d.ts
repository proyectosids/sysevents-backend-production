export declare class StripePaymentService {
    private readonly paymentsRepository;
    private readonly registrationsRepository;
    private readonly eventsRepository;
    private readonly siteDataRepository;
    private readonly pricingService;
    private getStripe;
    private getStripeSettings;
    createCheckoutOrder(eventId: string, registrationId: string, userId?: string, selection?: {
        registrationTypeId?: string;
        addonSelections?: Array<{
            addonId: string;
            quantity: number;
        }>;
        displayCurrency?: string;
        userEmail?: string;
    }): Promise<import("../../domain/entities/payment").PaymentOrder | null>;
    private createPricingQuote;
    handleWebhook(rawBody: Buffer, signature: string | string[] | undefined): Promise<{
        received: boolean;
        duplicate: boolean;
    }>;
}
