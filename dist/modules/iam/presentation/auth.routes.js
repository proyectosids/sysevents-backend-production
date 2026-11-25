"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const rate_limiters_1 = require("../../security/presentation/rate-limiters");
const tenants_repository_1 = require("../../tenants/infrastructure/repositories/tenants.repository");
const tenant_invitation_1 = require("../../tenants/domain/tenant-invitation");
const sync_tenant_roles_1 = require("../../tenants/application/sync-tenant-roles");
const email_service_1 = require("../../communications/application/services/email.service");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const tenant_schemas_1 = require("../../tenants/presentation/schemas/tenant.schemas");
const auth_service_1 = require("../application/services/auth.service");
const iam_repository_1 = require("../infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("./middlewares/authenticate.middleware");
const auth_schemas_1 = require("./schemas/auth.schemas");
exports.authRouter = (0, express_1.Router)();
const authService = new auth_service_1.AuthService();
const iamRepository = new iam_repository_1.IamRepository();
const tenantsRepository = new tenants_repository_1.TenantsRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const emailService = new email_service_1.EmailService();
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function isAllowedAuthReturnTo(value) {
    if (!value)
        return false;
    if (value.startsWith('/participant-register?'))
        return true;
    if (!value.startsWith('/accept-invitation?'))
        return false;
    try {
        const url = new URL(value, 'https://sysevents.local');
        return url.pathname === '/accept-invitation' && (url.searchParams.get('token')?.length ?? 0) >= 32;
    }
    catch {
        return false;
    }
}
async function getInvitation(token) {
    const invitation = await tenantsRepository.findInvitationByTokenHash(hashToken(token));
    if (!invitation) {
        throw new app_error_1.AppError('La invitación no existe.', 404, 'INVITATION_NOT_FOUND');
    }
    return invitation;
}
function invitationStatus(invitation) {
    return (0, tenant_invitation_1.tenantInvitationStatus)(invitation);
}
function assertInvitationCanBeAccepted(invitation) {
    const status = invitationStatus(invitation);
    if (status === 'revoked') {
        throw new app_error_1.AppError('Esta invitación fue revocada.', 410, 'INVITATION_REVOKED');
    }
    if (status === 'expired') {
        throw new app_error_1.AppError('Esta invitación venció. Solicita que la reenvíen.', 410, 'INVITATION_EXPIRED');
    }
    return status;
}
async function invitationResponse(invitation) {
    const fallbackEvent = invitation.eventId ? null : await eventsRepository.findCurrentEventByTenant(invitation.tenantId);
    return {
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        accountStatus: invitation.accountStatus,
        tenantName: invitation.tenantName,
        tenantRole: invitation.tenantRole,
        academicRoles: invitation.academicRoles,
        eventId: invitation.eventId ?? fallbackEvent?.id ?? null,
        eventName: invitation.eventName ?? fallbackEvent?.name ?? null,
        expiresAt: invitation.expiresAt,
        status: invitationStatus(invitation),
    };
}
exports.authRouter.get('/invitations/:token', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { token } = tenant_schemas_1.invitationTokenParamsSchema.parse(req.params);
    const invitation = await getInvitation(token);
    return (0, api_response_1.sendSuccess)(res, 'Invitation retrieved successfully', await invitationResponse(invitation));
}));
exports.authRouter.post('/invitations/:token/accept', rate_limiters_1.loginRateLimiter, authenticate_middleware_1.authenticateMiddleware, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { token } = tenant_schemas_1.invitationTokenParamsSchema.parse(req.params);
    const input = tenant_schemas_1.acceptTenantInvitationSchema.parse(req.body);
    const invitation = await getInvitation(token);
    const status = assertInvitationCanBeAccepted(invitation);
    const authenticatedEmail = req.user.email.trim().toLowerCase();
    const invitedEmail = invitation.email.trim().toLowerCase();
    if (authenticatedEmail !== invitedEmail || !(0, tenant_invitation_1.invitationEmailMatches)(invitation.email, input.email) || req.user.id !== invitation.userId) {
        throw new app_error_1.AppError('Inicia sesión con el mismo correo al que se envió la invitación.', 403, 'INVITATION_EMAIL_MISMATCH');
    }
    if (status !== 'accepted') {
        await tenantsRepository.acceptInvitation(invitation.id);
        await (0, sync_tenant_roles_1.syncTenantRoles)(invitation.userId, iamRepository, tenantsRepository);
    }
    const session = await authService.issueSessionForUser(invitation.userId);
    return (0, api_response_1.sendSuccess)(res, 'Invitation accepted successfully', {
        session,
        invitation: await invitationResponse({ ...invitation, acceptedAt: invitation.acceptedAt ?? new Date() }),
    });
}));
exports.authRouter.post('/invitations/:token/register', rate_limiters_1.loginRateLimiter, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { token } = tenant_schemas_1.invitationTokenParamsSchema.parse(req.params);
    const input = tenant_schemas_1.completeTenantInvitationRegistrationSchema.parse(req.body);
    const invitation = await getInvitation(token);
    assertInvitationCanBeAccepted(invitation);
    if (!(0, tenant_invitation_1.invitationEmailMatches)(invitation.email, input.email)) {
        throw new app_error_1.AppError('El correo no corresponde a esta invitación.', 403, 'INVITATION_EMAIL_MISMATCH');
    }
    if (invitation.accountStatus === 'active') {
        throw new app_error_1.AppError('Esta cuenta ya existe. Inicia sesión para aceptar la invitación.', 409, 'INVITATION_LOGIN_REQUIRED');
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    await iamRepository.updateUser(invitation.userId, {
        firstName: input.firstName,
        lastName: input.lastName,
    });
    await iamRepository.updatePassword(invitation.userId, passwordHash);
    await tenantsRepository.acceptInvitation(invitation.id);
    await (0, sync_tenant_roles_1.syncTenantRoles)(invitation.userId, iamRepository, tenantsRepository);
    const session = await authService.issueSessionForUser(invitation.userId);
    return (0, api_response_1.sendSuccess)(res, 'Invitation registration completed successfully', {
        session,
        invitation: await invitationResponse({
            ...invitation,
            firstName: input.firstName,
            lastName: input.lastName,
            accountStatus: 'active',
            acceptedAt: new Date(),
        }),
    });
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
exports.authRouter.post('/forgot-password', rate_limiters_1.loginRateLimiter, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { email, returnTo } = auth_schemas_1.forgotPasswordSchema.parse(req.body);
    const user = await iamRepository.findUserByEmail(email);
    if (user?.status === 'active') {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await iamRepository.createPasswordResetToken({
            userId: user.id,
            tokenHash: hashToken(token),
            expiresAt,
        });
        const resetUrl = new URL('/reset-password', env_1.env.APP_PUBLIC_URL);
        resetUrl.searchParams.set('token', token);
        if (returnTo && isAllowedAuthReturnTo(returnTo)) {
            resetUrl.searchParams.set('returnTo', returnTo);
            resetUrl.searchParams.set('email', user.email);
        }
        await emailService.sendTemplate('password_reset', user.email, {
            name: user.firstName,
            resetUrl: resetUrl.toString(),
        });
    }
    return (0, api_response_1.sendSuccess)(res, 'If an active account exists for that email, password reset instructions were sent');
}));
exports.authRouter.post('/reset-password', rate_limiters_1.loginRateLimiter, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = auth_schemas_1.resetPasswordSchema.parse(req.body);
    const passwordHash = await bcryptjs_1.default.hash(input.newPassword, 12);
    const reset = await iamRepository.resetPasswordWithToken(hashToken(input.token), passwordHash);
    if (!reset) {
        throw new app_error_1.AppError('Password reset link is invalid or has expired', 410, 'PASSWORD_RESET_INVALID_OR_EXPIRED');
    }
    return (0, api_response_1.sendSuccess)(res, 'Password updated successfully');
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