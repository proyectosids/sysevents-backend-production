"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saasRouter = exports.publicSaasRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const auth_service_1 = require("../../iam/application/services/auth.service");
const iam_repository_1 = require("../../iam/infrastructure/repositories/iam.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const tenants_repository_1 = require("../../tenants/infrastructure/repositories/tenants.repository");
const saas_repository_1 = require("../infrastructure/repositories/saas.repository");
const saas_schemas_1 = require("./schemas/saas.schemas");
exports.publicSaasRouter = (0, express_1.Router)();
exports.saasRouter = (0, express_1.Router)();
const saasRepository = new saas_repository_1.SaasRepository();
const authService = new auth_service_1.AuthService();
const iamRepository = new iam_repository_1.IamRepository();
const tenantsRepository = new tenants_repository_1.TenantsRepository();
exports.publicSaasRouter.get('/plans', (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const plans = await saasRepository.listPublicPlans();
    return (0, api_response_1.sendSuccess)(res, 'Plans retrieved successfully', plans);
}));
exports.saasRouter.post('/onboarding', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = saas_schemas_1.onboardingSchema.parse(req.body);
    const plan = await saasRepository.findPlanById(input.planId);
    if (!plan) {
        throw new app_error_1.AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }
    const user = await authService.register(input.account, { assignPlatformAdminIfFirstUser: false });
    const tenant = await tenantsRepository.createTenant({
        ...input.organization,
        status: 'active',
    });
    await tenantsRepository.addUserToTenant({
        tenantId: tenant.id,
        userId: user.id,
        tenantRole: 'owner',
    });
    await iamRepository.assignRoleToUserByName(user.id, 'tenant_owner');
    await saasRepository.createSubscription({
        tenantId: tenant.id,
        planId: plan.id,
        createdBy: user.id,
    });
    const session = await authService.issueSessionForUser(user.id);
    return (0, api_response_1.sendSuccess)(res, 'Organization created successfully', {
        user,
        tenant,
        plan,
        session,
    }, 201);
}));
exports.saasRouter.get('/my/subscriptions', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('subscriptions.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const subscriptions = await saasRepository.listSubscriptionsForUser(req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'My subscriptions retrieved successfully', subscriptions);
}));
exports.saasRouter.post('/my/subscriptions', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('subscriptions.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = saas_schemas_1.contractPlanSchema.parse(req.body);
    const membership = await tenantsRepository.findTenantUser(input.tenantId, req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.tenantRole)) {
        throw new app_error_1.AppError('You cannot contract plans for this organization', 403, 'FORBIDDEN');
    }
    if (await saasRepository.hasActiveSubscriptionForTenant(input.tenantId)) {
        throw new app_error_1.AppError('Esta organizacion ya tiene un paquete activo.', 409, 'TENANT_ALREADY_HAS_ACTIVE_SUBSCRIPTION');
    }
    const plan = await saasRepository.findPlanById(input.planId);
    if (!plan)
        throw new app_error_1.AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    const subscriptionId = await saasRepository.createSubscription({
        tenantId: input.tenantId,
        planId: input.planId,
        createdBy: req.user.id,
    });
    return (0, api_response_1.sendSuccess)(res, 'Plan contracted successfully', { subscriptionId, plan }, 201);
}));
exports.saasRouter.get('/platform/dashboard', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('subscriptions.manage'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const dashboard = await saasRepository.getPlatformDashboard();
    return (0, api_response_1.sendSuccess)(res, 'Platform dashboard retrieved successfully', dashboard);
}));
exports.saasRouter.get('/platform/plans', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('plans.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const plans = await saasRepository.listPlans();
    return (0, api_response_1.sendSuccess)(res, 'Plans retrieved successfully', plans);
}));
exports.saasRouter.post('/platform/plans', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('plans.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const input = saas_schemas_1.createPlanSchema.parse(req.body);
    const plan = await saasRepository.createPlan(input);
    return (0, api_response_1.sendSuccess)(res, 'Plan created successfully', plan, 201);
}));
exports.saasRouter.patch('/platform/plans/:id', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('plans.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { id } = saas_schemas_1.planIdParamsSchema.parse(req.params);
    const input = saas_schemas_1.updatePlanSchema.parse(req.body);
    const plan = await saasRepository.updatePlan(id, input);
    if (!plan) {
        throw new app_error_1.AppError('Plan not found', 404, 'PLAN_NOT_FOUND');
    }
    return (0, api_response_1.sendSuccess)(res, 'Plan updated successfully', plan);
}));
exports.saasRouter.get('/platform/subscriptions', authenticate_middleware_1.authenticateMiddleware, (0, require_permission_middleware_1.requirePermission)('subscriptions.manage'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const subscriptions = await saasRepository.listSubscriptions(250);
    return (0, api_response_1.sendSuccess)(res, 'Subscriptions retrieved successfully', subscriptions);
}));
//# sourceMappingURL=saas.routes.js.map