"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionsRouter = void 0;
const express_1 = require("express");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const iam_repository_1 = require("../infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("./middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("./middlewares/require-permission.middleware");
const iam_schemas_1 = require("./schemas/iam.schemas");
exports.permissionsRouter = (0, express_1.Router)();
const iamRepository = new iam_repository_1.IamRepository();
exports.permissionsRouter.use(authenticate_middleware_1.authenticateMiddleware);
exports.permissionsRouter.get('/', (0, require_permission_middleware_1.requirePermission)('permissions.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const permissions = await iamRepository.listPermissions();
    return (0, api_response_1.sendSuccess)(res, 'Permissions retrieved successfully', permissions);
}));
exports.permissionsRouter.post('/', (0, require_permission_middleware_1.requirePermission)('permissions.create'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = iam_schemas_1.createPermissionSchema.parse(req.body);
    const permission = await iamRepository.createPermission(input);
    return (0, api_response_1.sendSuccess)(res, 'Permission created successfully', permission, 201);
}));
//# sourceMappingURL=permissions.routes.js.map