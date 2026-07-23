"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMiddleware = sanitizeMiddleware;
function sanitizeValue(value) {
    if (typeof value === 'string') {
        return value.replace(/\u0000/g, '').trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, childValue]) => [
            key,
            sanitizeValue(childValue),
        ]));
    }
    return value;
}
function sanitizeMiddleware(req, _res, next) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        req.body = sanitizeValue(req.body);
    }
    next();
}
//# sourceMappingURL=sanitize.middleware.js.map