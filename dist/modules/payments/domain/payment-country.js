"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMexicoCountry = isMexicoCountry;
function isMexicoCountry(value) {
    if (!value)
        return false;
    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    return ['mx', 'mex', 'mexico', 'estados unidos mexicanos'].includes(normalized);
}
//# sourceMappingURL=payment-country.js.map