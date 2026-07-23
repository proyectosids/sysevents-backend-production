export type PaymentPricingQuote = {
    source: 'frankfurter';
    baseCurrency: string;
    quoteCurrency: string;
    amountCents: number;
    estimatedAmountCents: number;
    rate: number;
    rateDate: string | null;
    fetchedAt: string;
    disclaimer: string;
};
export declare class PricingService {
    createQuote(amountCents: number, baseCurrency: string, quoteCurrency?: string | null): Promise<PaymentPricingQuote | null>;
    private getRate;
}
