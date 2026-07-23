"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, message, data, statusCode = 200) {
    const body = { success: true, message };
    if (data !== undefined) {
        body.data = data;
    }
    return res.status(statusCode).json(body);
}
function sendError(res, message, errorCode, statusCode, details) {
    const body = { success: false, message, errorCode };
    if (details !== undefined) {
        body.details = details;
    }
    return res.status(statusCode).json(body);
}
//# sourceMappingURL=api-response.js.map