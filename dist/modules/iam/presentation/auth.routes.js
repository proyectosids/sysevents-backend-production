"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const rate_limiters_1 = require("../../security/presentation/rate-limiters");
const tenants_repository_1 = require("../../tenants/infrastructure/repositories/tenants.repository");
const tenant_schemas_1 = require("../../tenants/presentation/schemas/tenant.schemas");
const auth_service_1 = require("../application/services/auth.service");
const iam_repository_1 = require("../infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("./middlewares/authenticate.middleware");
const auth_schemas_1 = require("./schemas/auth.schemas");
exports.authRouter = (0, express_1.Router)();
const authService = new auth_service_1.AuthService();
const iamRepository = new iam_repository_1.IamRepository();
const tenantsRepository = new tenants_repository_1.TenantsRepository();
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function getValidInvitation(token) {
    const invitation = await tenantsRepository.findInvitationByTokenHash(hashToken(token));
    if (!invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date()) {
        throw new app_error_1.AppError('Invitation is invalid or has expired', 410, 'INVITATION_INVALID_OR_EXPIRED');
    }
    return invitation;
}
exports.authRouter.get('/invitations/:token', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { token } = tenant_schemas_1.invitationTokenParamsSchema.parse(req.params);
    const invitation = await getValidInvitation(token);
    return (0, api_response_1.sendSuccess)(res, 'Invitation retrieved successfully', {
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        tenantName: invitation.tenantName,
        tenantRole: invitation.tenantRole,
        expiresAt: invitation.expiresAt,
    });
}));
exports.authRouter.post('/invitations/:token/accept', rate_limiters_1.loginRateLimiter, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { token } = tenant_schemas_1.invitationTokenParamsSchema.parse(req.params);
    const input = tenant_schemas_1.acceptTenantInvitationSchema.parse(req.body);
    const invitation = await getValidInvitation(token);
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    await iamRepository.updatePassword(invitation.userId, passwordHash);
    await tenantsRepository.acceptInvitation(invitation.id);
    return (0, api_response_1.sendSuccess)(res, 'Invitation accepted successfully');
}));
exports.authRouter.post('/register', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = auth_schemas_1.registerSchema.parse(req.body);
    const user = await authService.register(input);
    return (0, api_response_1.sendSuccess)(res, 'User registered successfully', user, 201);
}));
exports.authRouter.post('/login', rate_limiters_1.loginRateLimiter, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = auth_schemas_1.loginSchema.parse(req.body);
    const session = await authService.login(input.email, input.password);
    return (0, api_response_1.sendSuccess)(res, 'Login successful', session);
}));
exports.authRouter.post('/refresh-token', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = auth_schemas_1.refreshTokenSchema.parse(req.body);
    const session = await authService.refresh(input.refreshToken);
    return (0, api_response_1.sendSuccess)(res, 'Token refreshed successfully', session);
}));
exports.authRouter.post('/logout', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = auth_schemas_1.refreshTokenSchema.parse(req.body);
    await authService.logout(input.refreshToken);
    return (0, api_response_1.sendSuccess)(res, 'Logout successful');
}));
exports.authRouter.get('/me', authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const user = await iamRepository.findUserById(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Authenticated user retrieved successfully', {
        ...user,
        permissions: req.user.permissions,
    });
}));
exports.authRouter.patch('/me/password', authenticate_middleware_1.authenticateMiddleware, rate_limiters_1.loginRateLimiter, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = auth_schemas_1.changePasswordSchema.parse(req.body);
    const user = await iamRepository.findUserWithPasswordById(req.user.id);
    if (!user || user.status !== 'active') {
        throw new app_error_1.AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const passwordMatches = await bcryptjs_1.default.compare(input.currentPassword, user.passwordHash);
    if (!passwordMatches) {
        throw new app_error_1.AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
    }
    const passwordHash = await bcryptjs_1.default.hash(input.newPassword, 12);
    await iamRepository.updatePassword(user.id, passwordHash);
    return (0, api_response_1.sendSuccess)(res, 'Password updated successfully');
}));
//# sourceMappingURL=auth.routes.js.map