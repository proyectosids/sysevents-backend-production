"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundMiddleware = notFoundMiddleware;
const api_response_1 = require("../utils/api-response");
function notFoundMiddleware(req, res) {
    return (0, api_response_1.sendError)(res, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND', 404);
}
//# sourceMappingURL=not-found.middleware.js.map