"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const node_crypto_1 = require("node:crypto");
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
function requestIdMiddleware(req, res, next) {
    const incomingRequestId = req.header('x-request-id');
    const requestId = incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
        ? incomingRequestId
        : (0, node_crypto_1.randomUUID)();
    res.locals.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
}
//# sourceMappingURL=request-id.middleware.js.map