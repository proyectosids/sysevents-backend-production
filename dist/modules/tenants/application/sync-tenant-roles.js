"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTenantRoles = syncTenantRoles;
const iam_repository_1 = require("../../iam/infrastructure/repositories/iam.repository");
const tenants_repository_1 = require("../infrastructure/repositories/tenants.repository");
const tenantWorkspaceRoles = [
    'tenant_owner',
    'academic_reviewer',
    'event_supervisor',
    'review_team_leader',
    'event_evaluator',
];
async function syncTenantRoles(userId, iamRepository = new iam_repository_1.IamRepository(), tenantsRepository = new tenants_repository_1.TenantsRepository()) {
    await iamRepository.removeRolesFromUserByNames(userId, tenantWorkspaceRoles);
    if (await tenantsRepository.userHasTenantRole(userId, ['owner', 'admin'])) {
        await iamRepository.assignRoleToUserByName(userId, 'tenant_owner');
    }
    const scopedRoles = await Promise.all([
        tenantsRepository.userHasScopedAcademicRole(userId, 'supervisor'),
        tenantsRepository.userHasScopedAcademicRole(userId, 'leader'),
        tenantsRepository.userHasScopedAcademicRole(userId, 'reviewer'),
        tenantsRepository.userHasScopedAcademicRole(userId, 'evaluator'),
    ]);
    const workspaceRoles = ['event_supervisor', 'review_team_leader', 'academic_reviewer', 'event_evaluator'];
    for (let index = 0; index < scopedRoles.length; index += 1) {
        if (scopedRoles[index])
            await iamRepository.assignRoleToUserByName(userId, workspaceRoles[index]);
    }
}
//# sourceMappingURL=sync-tenant-roles.js.map