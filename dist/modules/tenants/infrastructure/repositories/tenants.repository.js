"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
const slug_1 = require("../../../../shared/utils/slug");
function mapTenant(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapTenantUser(row) {
    const accessStatus = row.invitation_accepted_at || (row.user_status === 'active' && !row.invitation_expires_at)
        ? 'active'
        : row.invitation_expires_at && row.invitation_expires_at <= new Date()
            ? 'expired'
            : 'pending';
    return {
        tenantId: row.tenant_id,
        userId: row.user_id,
        tenantRole: row.tenant_role,
        createdAt: row.created_at,
        accessStatus,
        user: {
            id: row.user_id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
        },
    };
}
class TenantsRepository {
    async listTenants() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .query('SELECT * FROM dbo.tenants ORDER BY created_at DESC');
        return result.recordset.map(mapTenant);
    }
    async listTenantsForUser(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT t.*
        FROM dbo.tenants t
        INNER JOIN dbo.tenant_users tu ON tu.tenant_id = t.id
        WHERE tu.user_id = @userId
        ORDER BY t.created_at DESC
      `);
        return result.recordset.map(mapTenant);
    }
    async createTenant(input) {
        const pool = await (0, database_1.getSqlPool)();
        const slug = await (0, slug_1.createUniqueSlug)(input.slug ?? input.name, (candidate) => this.tenantSlugExists(candidate), {
            fallback: 'organizacion',
            maxLength: 120,
        });
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            const result = await transaction
                .request()
                .input('name', mssql_1.default.NVarChar(180), input.name)
                .input('slug', mssql_1.default.NVarChar(120), slug)
                .input('status', mssql_1.default.NVarChar(30), input.status ?? 'active')
                .query(`
          INSERT INTO dbo.tenants (name, slug, status)
          OUTPUT INSERTED.*
          VALUES (@name, @slug, @status)
        `);
            const tenant = mapTenant(result.recordset[0]);
            await transaction
                .request()
                .input('tenantId', mssql_1.default.UniqueIdentifier, tenant.id)
                .query('INSERT INTO dbo.tenant_settings (tenant_id) VALUES (@tenantId)');
            await transaction.commit();
            return tenant;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async tenantSlugExists(slug, excludeId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('slug', mssql_1.default.NVarChar(120), slug)
            .input('excludeId', mssql_1.default.UniqueIdentifier, excludeId ?? null)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.tenants
        WHERE slug = @slug AND (@excludeId IS NULL OR id <> @excludeId)
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async findTenantById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query('SELECT TOP 1 * FROM dbo.tenants WHERE id = @id');
        return result.recordset[0] ? mapTenant(result.recordset[0]) : null;
    }
    async updateTenant(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar(180), input.name ?? null)
            .input('slug', mssql_1.default.NVarChar(120), input.slug ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .query(`
        UPDATE dbo.tenants
        SET
          name = COALESCE(@name, name),
          slug = COALESCE(@slug, slug),
          status = COALESCE(@status, status),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        return result.recordset[0] ? mapTenant(result.recordset[0]) : null;
    }
    async addUserToTenant(input) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, input.tenantId)
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
            .input('tenantRole', mssql_1.default.NVarChar(80), input.tenantRole)
            .query(`
        IF EXISTS (
          SELECT 1 FROM dbo.tenant_users WHERE tenant_id = @tenantId AND user_id = @userId
        )
        BEGIN
          UPDATE dbo.tenant_users
          SET tenant_role = @tenantRole
          WHERE tenant_id = @tenantId AND user_id = @userId
        END
        ELSE
        BEGIN
          INSERT INTO dbo.tenant_users (tenant_id, user_id, tenant_role)
          VALUES (@tenantId, @userId, @tenantRole)
        END
      `);
    }
    async findTenantUser(tenantId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT TOP 1 tenant_role
        FROM dbo.tenant_users
        WHERE tenant_id = @tenantId AND user_id = @userId
      `);
        return result.recordset[0]
            ? { tenantId, userId, tenantRole: result.recordset[0].tenant_role }
            : null;
    }
    async listTenantUsers(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT
          tu.tenant_id,
          tu.user_id,
          tu.tenant_role,
          tu.created_at,
          u.email,
          u.first_name,
          u.last_name,
          u.status AS user_status,
          invitation.expires_at AS invitation_expires_at,
          invitation.accepted_at AS invitation_accepted_at
        FROM dbo.tenant_users tu
        INNER JOIN dbo.users u ON u.id = tu.user_id
        OUTER APPLY (
          SELECT TOP 1
            tenant_invitation.expires_at,
            tenant_invitation.accepted_at
          FROM dbo.tenant_invitations tenant_invitation
          WHERE tenant_invitation.tenant_id = tu.tenant_id
            AND tenant_invitation.user_id = tu.user_id
            AND tenant_invitation.revoked_at IS NULL
          ORDER BY tenant_invitation.created_at DESC
        ) invitation
        WHERE tu.tenant_id = @tenantId
        ORDER BY tu.created_at DESC
      `);
        return result.recordset.map(mapTenantUser);
    }
    async countTenantUsers(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query('SELECT COUNT(1) AS total FROM dbo.tenant_users WHERE tenant_id = @tenantId');
        return result.recordset[0]?.total ?? 0;
    }
    async countTenantsForUser(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT COUNT(DISTINCT tu.tenant_id) AS total
        FROM dbo.tenant_users tu
        INNER JOIN dbo.tenants t ON t.id = tu.tenant_id
        WHERE tu.user_id = @userId
          AND t.status = 'active'
      `);
        return result.recordset[0]?.total ?? 0;
    }
    async tenantNameExistsForUser(userId, name) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('name', mssql_1.default.NVarChar(180), name.trim().toLowerCase())
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.tenant_users tu
        INNER JOIN dbo.tenants t ON t.id = tu.tenant_id
        WHERE tu.user_id = @userId
          AND LOWER(LTRIM(RTRIM(t.name))) = @name
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async countAdminTenantUsers(tenantId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.tenant_users
        WHERE tenant_id = @tenantId
          AND tenant_role IN ('owner', 'admin')
      `);
        return result.recordset[0]?.total ?? 0;
    }
    async countTenantUsersByRoles(tenantId, roles) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .input('roles', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(roles))
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.tenant_users tu
        INNER JOIN OPENJSON(@roles) WITH (role_name NVARCHAR(80) '$') roles
          ON roles.role_name = tu.tenant_role
        WHERE tu.tenant_id = @tenantId
      `);
        return result.recordset[0]?.total ?? 0;
    }
    async userHasTenantRole(userId, roles) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('roles', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(roles))
            .query(`
        SELECT COUNT(1) AS total
        FROM dbo.tenant_users tu
        INNER JOIN OPENJSON(@roles) WITH (role_name NVARCHAR(80) '$') roles
          ON roles.role_name = tu.tenant_role
        WHERE tu.user_id = @userId
      `);
        return (result.recordset[0]?.total ?? 0) > 0;
    }
    async removeUserFromTenant(tenantId, userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, tenantId)
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        DELETE FROM dbo.tenant_users
        WHERE tenant_id = @tenantId AND user_id = @userId;

        SELECT @@ROWCOUNT AS affected;
      `);
        return Number(result.recordset[0]?.affected ?? 0) > 0;
    }
    async createInvitation(input) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('tenantId', mssql_1.default.UniqueIdentifier, input.tenantId)
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
            .input('tokenHash', mssql_1.default.NVarChar(128), input.tokenHash)
            .input('expiresAt', mssql_1.default.DateTime2, input.expiresAt)
            .input('createdBy', mssql_1.default.UniqueIdentifier, input.createdBy ?? null)
            .query(`
        UPDATE dbo.tenant_invitations
        SET revoked_at = SYSUTCDATETIME()
        WHERE tenant_id = @tenantId
          AND user_id = @userId
          AND accepted_at IS NULL
          AND revoked_at IS NULL;

        INSERT INTO dbo.tenant_invitations (
          tenant_id, user_id, token_hash, expires_at, created_by
        )
        VALUES (
          @tenantId, @userId, @tokenHash, @expiresAt, @createdBy
        );
      `);
    }
    async findInvitationByTokenHash(tokenHash) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tokenHash', mssql_1.default.NVarChar(128), tokenHash)
            .query(`
        SELECT TOP 1
          invitation.id,
          invitation.tenant_id,
          tenant.name AS tenant_name,
          invitation.user_id,
          users.email,
          users.first_name,
          users.last_name,
          membership.tenant_role,
          invitation.expires_at,
          invitation.accepted_at,
          invitation.revoked_at
        FROM dbo.tenant_invitations invitation
        INNER JOIN dbo.tenants tenant ON tenant.id = invitation.tenant_id
        INNER JOIN dbo.users users ON users.id = invitation.user_id
        INNER JOIN dbo.tenant_users membership
          ON membership.tenant_id = invitation.tenant_id
         AND membership.user_id = invitation.user_id
        WHERE invitation.token_hash = @tokenHash
      `);
        const row = result.recordset[0];
        if (!row)
            return null;
        return {
            id: row.id,
            tenantId: row.tenant_id,
            tenantName: row.tenant_name,
            userId: row.user_id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            tenantRole: row.tenant_role,
            expiresAt: row.expires_at,
            acceptedAt: row.accepted_at,
            revokedAt: row.revoked_at,
        };
    }
    async acceptInvitation(id) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query(`
        UPDATE dbo.tenant_invitations
        SET accepted_at = SYSUTCDATETIME()
        WHERE id = @id
          AND accepted_at IS NULL
          AND revoked_at IS NULL
      `);
    }
}
exports.TenantsRepository = TenantsRepository;
//# sourceMappingURL=tenants.repository.js.map