"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_1 = require("../../../config/database");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
exports.healthRouter = (0, express_1.Router)();
exports.healthRouter.get('/', (_req, res) => {
    return (0, api_response_1.sendSuccess)(res, 'SysEvents API is running', {
        timestamp: new Date().toISOString(),
    });
});
exports.healthRouter.get('/database', (0, async_handler_1.asyncHandler)(async (_req, res) => {
    await (0, database_1.testDatabaseConnection)();
    return (0, api_response_1.sendSuccess)(res, 'Database connection is healthy');
}));
//# sourceMappingURL=health.routes.js.map