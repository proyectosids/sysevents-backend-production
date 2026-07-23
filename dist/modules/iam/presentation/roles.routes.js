"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const iam_repository_1 = require("../infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("./middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("./middlewares/require-permission.middleware");
const iam_schemas_1 = require("./schemas/iam.schemas");
exports.rolesRouter = (0, express_1.Router)();
const iamRepository = new iam_repository_1.IamRepository();
exports.rolesRouter.use(authenticate_middleware_1.authenticateMiddleware);
exports.rolesRouter.get('/', (0, require_permission_middleware_1.requirePermission)('roles.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const roles = await iamRepository.listRoles();
    return (0, api_response_1.sendSuccess)(res, 'Roles retrieved successfully', roles);
}));
exports.rolesRouter.post('/', (0, require_permission_middleware_1.requirePermission)('roles.create'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = iam_schemas_1.createRoleSchema.parse(req.body);
    const role = await iamRepository.createRole(input);
    return (0, api_response_1.sendSuccess)(res, 'Role created successfully', role, 201);
}));
exports.rolesRouter.patch('/:id', (0, require_permission_middleware_1.requirePermission)('roles.update'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = iam_schemas_1.idParamsSchema.parse(req.params);
    const input = iam_schemas_1.updateRoleSchema.parse(req.body);
    const role = await iamRepository.updateRole(id, input);
    if (!role) {
        throw new app_error_1.AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Role updated successfully', role);
}));
exports.rolesRouter.post('/:id/permissions', (0, require_permission_middleware_1.requirePermission)('roles.assign_permissions'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = iam_schemas_1.idParamsSchema.parse(req.params);
    const input = iam_schemas_1.assignPermissionsSchema.parse(req.body);
    await iamRepository.assignPermissionsToRole(id, input.permissionIds);
    return (0, api_response_1.sendSuccess)(res, 'Permissions assigned to role successfully');
}));
//# sourceMappingURL=roles.routes.js.map