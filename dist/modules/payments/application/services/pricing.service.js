"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const app_error_1 = require("../../../../shared/errors/app-error");
const rateCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
function normalizeCurrency(value) {
    return (value ?? '').trim().toUpperCase();
}
class PricingService {
    async createQuote(amountCents, baseCurrency, quoteCurrency) {
        const base = normalizeCurrency(baseCurrency);
        const quote = normalizeCurrency(quoteCurrency);
        if (!quote || !base || quote === base || amountCents <= 0)
            return null;
        const rate = await this.getRate(base, quote);
        return {
            source: 'frankfurter',
            baseCurrency: base,
            quoteCurrency: quote,
            amountCents,
            estimatedAmountCents: Math.round(amountCents * rate.rate),
            rate: rate.rate,
            rateDate: rate.date,
            fetchedAt: new Date().toISOString(),
            disclaimer: `El cargo final sera realizado en ${base}. El monto en ${quote} es una estimacion basada en el tipo de cambio actual.`,
        };
    }
    async getRate(baseCurrency, quoteCurrency) {
        const cacheKey = `${baseCurrency}:${quoteCurrency}`;
        const cached = rateCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now())
            return cached;
        const response = await fetch(`https://api.frankfurter.dev/v2/rate/${encodeURIComponent(baseCurrency)}/${encodeURIComponent(quoteCurrency)}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload.rate !== 'number') {
            throw new app_error_1.AppError(payload.message || 'No se pudo obtener el tipo de cambio actual.', 502, 'EXCHANGE_RATE_PROVIDER_ERROR');
        }
        const next = { rate: payload.rate, date: payload.date ?? null, expiresAt: Date.now() + CACHE_TTL_MS };
        rateCache.set(cacheKey, next);
        return next;
    }
}
exports.PricingService = PricingService;
//# sourceMappingURL=pricing.service.js.map