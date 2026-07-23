"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../shared/errors/app-error");
const logger_1 = require("../../../shared/logger/logger");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const email_service_1 = require("../../communications/application/services/email.service");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const iam_repository_1 = require("../../iam/infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const saas_repository_1 = require("../../saas/infrastructure/repositories/saas.repository");
const tenants_repository_1 = require("../infrastructure/repositories/tenants.repository");
const tenant_schemas_1 = require("./schemas/tenant.schemas");
exports.tenantsRouter = (0, express_1.Router)();
const tenantsRepository = new tenants_repository_1.TenantsRepository();
const iamRepository = new iam_repository_1.IamRepository();
const saasRepository = new saas_repository_1.SaasRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const emailService = new email_service_1.EmailService();
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function consumesAdminSeat(tenantRole) {
    return tenantRole === 'owner' || tenantRole === 'admin';
}
async function syncTenantRoles(userId) {
    await iamRepository.removeRolesFromUserByNames(userId, ['tenant_owner', 'academic_reviewer']);
    if (await tenantsRepository.userHasTenantRole(userId, ['owner', 'admin'])) {
        await iamRepository.assignRoleToUserByName(userId, 'tenant_owner');
    }
    if (await tenantsRepository.userHasTenantRole(userId, ['reviewer'])) {
        await iamRepository.assignRoleToUserByName(userId, 'academic_reviewer');
    }
}
async function sendTenantInvitation(input) {
    const token = crypto_1.default.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await tenantsRepository.createInvitation({
        tenantId: input.tenantId,
        userId: input.userId,
        tokenHash: hashToken(token),
        expiresAt,
        createdBy: input.createdBy,
    });
    const invitationUrl = `${env_1.env.APP_PUBLIC_URL.replace(/\/$/, '')}/accept-invitation?token=${encodeURIComponent(token)}`;
    const event = await eventsRepository.findCurrentEventByTenant(input.tenantId);
    const eventName = event?.name ?? 'evento activo';
    const delivery = await emailService.sendTemplate('tenant_invitation', input.email, {
        name: input.firstName,
        organizationName: input.tenantName,
        eventName,
        invitationUrl,
        expiresIn: '48 horas',
    });
    if (env_1.env.NODE_ENV !== 'production') {
        logger_1.logger.info('Tenant invitation link generated', {
            email: input.email,
            tenantName: input.tenantName,
            eventName,
            invitationUrl,
            emailDelivery: delivery?.status ?? 'skipped',
        });
    }
    return {
        invitationUrl: env_1.env.NODE_ENV === 'production' ? undefined : invitationUrl,
        expiresAt,
        emailDelivery: delivery?.status ?? 'skipped',
    };
}
exports.tenantsRouter.use(authenticate_middleware_1.authenticateMiddleware);
exports.tenantsRouter.get('/', (0, require_permission_middleware_1.requirePermission)('tenants.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const tenants = req.user.permissions.includes('subscriptions.manage')
        ? await tenantsRepository.listTenants()
        : await tenantsRepository.listTenantsForUser(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Tenants retrieved successfully', tenants);
}));
exports.tenantsRouter.post('/', (0, require_permission_middleware_1.requirePermission)('tenants.create'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = tenant_schemas_1.createTenantSchema.parse(req.body);
    const isPlatformAdmin = req.user.permissions.includes('subscriptions.manage');
    if (!isPlatformAdmin) {
        const [tenantsCount, maxOrganizations, duplicatedName] = await Promise.all([
            tenantsRepository.countTenantsForUser(req.user.id),
            saasRepository.getMaxOrganizationsForUser(req.user.id),
            tenantsRepository.tenantNameExistsForUser(req.user.id, input.name),
        ]);
        if (duplicatedName) {
            throw new app_error_1.AppError('Ya tienes una organizacion con ese nombre.', 409, 'TENANT_NAME_ALREADY_USED_BY_USER');
        }
        if (tenantsCount >= maxOrganizations) {
            throw new app_error_1.AppError(`Tu paquete permite hasta ${maxOrganizations} organizacion${maxOrganizations === 1 ? '' : 'es'}.`, 403, 'PLAN_ORGANIZATION_LIMIT_REACHED');
        }
    }
    const tenant = await tenantsRepository.createTenant(input);
    return (0, api_response_1.sendSuccess)(res, 'Tenant created successfully', tenant, 201);
}));
exports.tenantsRouter.get('/:id', (0, require_permission_middleware_1.requirePermission)('tenants.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = tenant_schemas_1.tenantIdParamsSchema.parse(req.params);
    const tenant = await tenantsRepository.findTenantById(id);
    if (!tenant) {
        throw new app_error_1.AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Tenant retrieved successfully', tenant);
}));
exports.tenantsRouter.patch('/:id', (0, require_permission_middleware_1.requirePermission)('tenants.update'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = tenant_schemas_1.tenantIdParamsSchema.parse(req.params);
    const input = tenant_schemas_1.updateTenantSchema.parse(req.body);
    const tenant = await tenantsRepository.updateTenant(id, input);
    if (!tenant) {
        throw new app_error_1.AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Tenant updated successfully', tenant);
}));
exports.tenantsRouter.post('/:id/users', (0, require_permission_middleware_1.requirePermission)('tenants.manage_users'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = tenant_schemas_1.tenantIdParamsSchema.parse(req.params);
    const input = tenant_schemas_1.addTenantUserSchema.parse(req.body);
    const tenant = await tenantsRepository.findTenantById(id);
    let user = input.userId
        ? await iamRepository.findUserById(input.userId)
        : await iamRepository.findUserByEmail(input.email);
    if (!tenant) {
        throw new app_error_1.AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    }
    const subscription = await saasRepository.findActiveSubscriptionByTenant(id);
    const tenantUsersCount = await tenantsRepository.countAdminTenantUsers(id);
    const existingMembership = user ? await tenantsRepository.findTenantUser(id, user.id) : null;
    const consumesPackageSeat = consumesAdminSeat(input.tenantRole)
        && (!existingMembership || !consumesAdminSeat(existingMembership.tenantRole));
    if (subscription && consumesPackageSeat && tenantUsersCount >= subscription.limits.maxUsers) {
        throw new app_error_1.AppError(`El paquete permite hasta ${subscription.limits.maxUsers} usuarios Owner/Admin. Los miembros y revisores no tienen restriccion.`, 403, 'PLAN_ADMIN_USER_LIMIT_REACHED');
    }
    let userCreated = false;
    if (!user) {
        if (!input.email || !input.firstName || !input.lastName) {
            throw new app_error_1.AppError('Collaborator account data is required', 400, 'COLLABORATOR_ACCOUNT_REQUIRED', {
                fields: ['firstName', 'lastName'],
            });
        }
        const passwordHash = await bcryptjs_1.default.hash(crypto_1.default.randomBytes(48).toString('hex'), 12);
        user = await iamRepository.createUser({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            status: 'inactive',
        });
        userCreated = true;
    }
    await tenantsRepository.addUserToTenant({
        tenantId: id,
        userId: user.id,
        tenantRole: input.tenantRole,
    });
    await syncTenantRoles(user.id);
    const invitation = await sendTenantInvitation({
        tenantId: id,
        tenantName: tenant.name,
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        createdBy: req.user.id,
    });
    return (0, api_response_1.sendSuccess)(res, 'User assigned to tenant successfully', {
        user,
        userCreated,
        invitation,
    });
}));
exports.tenantsRouter.patch('/:id/users/:userId', (0, require_permission_middleware_1.requirePermission)('tenants.manage_users'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, userId } = tenant_schemas_1.tenantUserParamsSchema.parse(req.params);
    const input = tenant_schemas_1.updateTenantUserSchema.parse(req.body);
    const membership = await tenantsRepository.findTenantUser(id, userId);
    if (!membership) {
        throw new app_error_1.AppError('Tenant user not found', 404, 'TENANT_USER_NOT_FOUND');
    }
    if (membership.tenantRole === 'owner' && input.tenantRole !== 'owner') {
        const ownersCount = await tenantsRepository.countTenantUsersByRoles(id, ['owner']);
        if (ownersCount <= 1) {
            throw new app_error_1.AppError('The organization must keep at least one owner', 409, 'LAST_TENANT_OWNER');
        }
    }
    const subscription = await saasRepository.findActiveSubscriptionByTenant(id);
    const tenantUsersCount = await tenantsRepository.countAdminTenantUsers(id);
    const consumesPackageSeat = consumesAdminSeat(input.tenantRole) && !consumesAdminSeat(membership.tenantRole);
    if (subscription && consumesPackageSeat && tenantUsersCount >= subscription.limits.maxUsers) {
        throw new app_error_1.AppError(`El paquete permite hasta ${subscription.limits.maxUsers} usuarios Owner/Admin. Los miembros y revisores no tienen restriccion.`, 403, 'PLAN_ADMIN_USER_LIMIT_REACHED');
    }
    await tenantsRepository.addUserToTenant({
        tenantId: id,
        userId,
        tenantRole: input.tenantRole,
    });
    await syncTenantRoles(userId);
    return (0, api_response_1.sendSuccess)(res, 'Tenant user role updated successfully');
}));
exports.tenantsRouter.patch('/:id/users/:userId/profile', (0, require_permission_middleware_1.requirePermission)('tenants.manage_users'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, userId } = tenant_schemas_1.tenantUserParamsSchema.parse(req.params);
    const input = tenant_schemas_1.updateTenantUserProfileSchema.parse(req.body);
    const membership = await tenantsRepository.findTenantUser(id, userId);
    if (!membership) {
        throw new app_error_1.AppError('Tenant user not found', 404, 'TENANT_USER_NOT_FOUND');
    }
    const existingUser = await iamRepository.findUserByEmail(input.email);
    if (existingUser && existingUser.id !== userId) {
        throw new app_error_1.AppError('Email is already registered', 409, 'EMAIL_ALREADY_REGISTERED');
    }
    const user = await iamRepository.updateUser(userId, input);
    return (0, api_response_1.sendSuccess)(res, 'Tenant user profile updated successfully', user);
}));
exports.tenantsRouter.delete('/:id/users/:userId', (0, require_permission_middleware_1.requirePermission)('tenants.manage_users'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, userId } = tenant_schemas_1.tenantUserParamsSchema.parse(req.params);
    const membership = await tenantsRepository.findTenantUser(id, userId);
    if (!membership) {
        throw new app_error_1.AppError('Tenant user not found', 404, 'TENANT_USER_NOT_FOUND');
    }
    if (membership.tenantRole === 'owner') {
        const ownersCount = await tenantsRepository.countTenantUsersByRoles(id, ['owner']);
        if (ownersCount <= 1) {
            throw new app_error_1.AppError('The organization must keep at least one owner', 409, 'LAST_TENANT_OWNER');
        }
    }
    await tenantsRepository.removeUserFromTenant(id, userId);
    await syncTenantRoles(userId);
    return (0, api_response_1.sendSuccess)(res, 'Tenant user removed successfully');
}));
exports.tenantsRouter.post('/:id/users/:userId/resend-invitation', (0, require_permission_middleware_1.requirePermission)('tenants.manage_users'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id, userId } = tenant_schemas_1.tenantUserParamsSchema.parse(req.params);
    const tenant = await tenantsRepository.findTenantById(id);
    const membership = await tenantsRepository.findTenantUser(id, userId);
    const user = await iamRepository.findUserById(userId);
    if (!tenant || !membership || !user) {
        throw new app_error_1.AppError('Tenant user not found', 404, 'TENANT_USER_NOT_FOUND');
    }
    const invitation = await sendTenantInvitation({
        tenantId: id,
        tenantName: tenant.name,
        userId,
        email: user.email,
        firstName: user.firstName,
        createdBy: req.user.id,
    });
    return (0, api_response_1.sendSuccess)(res, 'Tenant invitation sent successfully', invitation);
}));
exports.tenantsRouter.get('/:id/users', (0, require_permission_middleware_1.requirePermission)('tenants.manage_users'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = tenant_schemas_1.tenantIdParamsSchema.parse(req.params);
    const tenant = await tenantsRepository.findTenantById(id);
    if (!tenant) {
        throw new app_error_1.AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    }
    const users = await tenantsRepository.listTenantUsers(id);
    return (0, api_response_1.sendSuccess)(res, 'Tenant users retrieved successfully', users);
}));
//# sourceMappingURL=tenants.routes.js.map