"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentTranslationUsageMonth = currentTranslationUsageMonth;
function currentTranslationUsageMonth(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    return `${year}-${month}`;
}
//# sourceMappingURL=translation-month.js.map