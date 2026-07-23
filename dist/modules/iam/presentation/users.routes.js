"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const iam_repository_1 = require("../infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("./middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("./middlewares/require-permission.middleware");
const iam_schemas_1 = require("./schemas/iam.schemas");
exports.usersRouter = (0, express_1.Router)();
const iamRepository = new iam_repository_1.IamRepository();
exports.usersRouter.use(authenticate_middleware_1.authenticateMiddleware);
exports.usersRouter.get('/', (0, require_permission_middleware_1.requirePermission)('users.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const users = await iamRepository.listUsers();
    return (0, api_response_1.sendSuccess)(res, 'Users retrieved successfully', users);
}));
exports.usersRouter.get('/:id', (0, require_permission_middleware_1.requirePermission)('users.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = iam_schemas_1.idParamsSchema.parse(req.params);
    const user = await iamRepository.findUserById(id);
    if (!user) {
        throw new app_error_1.AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'User retrieved successfully', user);
}));
exports.usersRouter.patch('/:id', (0, require_permission_middleware_1.requirePermission)('users.update'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = iam_schemas_1.idParamsSchema.parse(req.params);
    const input = iam_schemas_1.updateUserSchema.parse(req.body);
    if (input.email) {
        const existingUser = await iamRepository.findUserByEmail(input.email);
        if (existingUser && existingUser.id !== id) {
            throw new app_error_1.AppError('Email is already registered', 409, 'EMAIL_ALREADY_REGISTERED');
        }
    }
    const user = await iamRepository.updateUser(id, input);
    if (!user) {
        throw new app_error_1.AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'User updated successfully', user);
}));
//# sourceMappingURL=users.routes.js.map