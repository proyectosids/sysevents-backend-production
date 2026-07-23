"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandlerMiddleware = errorHandlerMiddleware;
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const app_error_1 = require("../errors/app-error");
const logger_1 = require("../logger/logger");
const api_response_1 = require("../utils/api-response");
function errorHandlerMiddleware(error, _req, res, _next) {
    if (error instanceof app_error_1.AppError) {
        return (0, api_response_1.sendError)(res, error.message, error.errorCode, error.statusCode, error.details);
    }
    if (error instanceof zod_1.ZodError) {
        return (0, api_response_1.sendError)(res, 'Validation error', 'VALIDATION_ERROR', 400, error.flatten().fieldErrors);
    }
    logger_1.logger.error('Unhandled application error', {
        error: error instanceof Error ? error.message : String(error),
        stack: env_1.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
    return (0, api_response_1.sendError)(res, 'Internal server error', 'INTERNAL_SERVER_ERROR', 500);
}
//# sourceMappingURL=error-handler.middleware.js.map