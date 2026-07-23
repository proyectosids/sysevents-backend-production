"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IamRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function mapUser(row) {
    return {
        id: row.id,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapUserWithPassword(row) {
    return { ...mapUser(row), passwordHash: row.password_hash };
}
function mapRole(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        isSystem: Boolean(row.is_system),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function mapPermission(row) {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
    };
}
class IamRepository {
    async countUsers() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query('SELECT COUNT(1) AS total FROM dbo.users');
        return result.recordset[0]?.total ?? 0;
    }
    async createUser(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('email', mssql_1.default.NVarChar(255), input.email.toLowerCase())
            .input('passwordHash', mssql_1.default.NVarChar(255), input.passwordHash)
            .input('firstName', mssql_1.default.NVarChar(120), input.firstName)
            .input('lastName', mssql_1.default.NVarChar(120), input.lastName)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? 'active')
            .query(`
        INSERT INTO dbo.users (email, password_hash, first_name, last_name, status)
        OUTPUT INSERTED.*
        VALUES (@email, @passwordHash, @firstName, @lastName, @status)
      `);
        return mapUser(result.recordset[0]);
    }
    async findUserByEmail(email) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('email', mssql_1.default.NVarChar(255), email.toLowerCase())
            .query('SELECT TOP 1 * FROM dbo.users WHERE email = @email');
        return result.recordset[0] ? mapUserWithPassword(result.recordset[0]) : null;
    }
    async findUserById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query('SELECT TOP 1 * FROM dbo.users WHERE id = @id');
        return result.recordset[0] ? mapUser(result.recordset[0]) : null;
    }
    async findUserWithPasswordById(id) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .query('SELECT TOP 1 * FROM dbo.users WHERE id = @id');
        return result.recordset[0] ? mapUserWithPassword(result.recordset[0]) : null;
    }
    async listUsers() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .query('SELECT * FROM dbo.users ORDER BY created_at DESC');
        return result.recordset.map(mapUser);
    }
    async updateUser(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('email', mssql_1.default.NVarChar(255), input.email?.toLowerCase() ?? null)
            .input('firstName', mssql_1.default.NVarChar(120), input.firstName ?? null)
            .input('lastName', mssql_1.default.NVarChar(120), input.lastName ?? null)
            .input('status', mssql_1.default.NVarChar(30), input.status ?? null)
            .query(`
        UPDATE dbo.users
        SET
          email = COALESCE(@email, email),
          first_name = COALESCE(@firstName, first_name),
          last_name = COALESCE(@lastName, last_name),
          status = COALESCE(@status, status),
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        return result.recordset[0] ? mapUser(result.recordset[0]) : null;
    }
    async updatePassword(id, passwordHash) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('passwordHash', mssql_1.default.NVarChar(255), passwordHash)
            .query(`
        UPDATE dbo.users
        SET password_hash = @passwordHash,
            status = 'active',
            updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        return result.recordset[0] ? mapUser(result.recordset[0]) : null;
    }
    async listRoles() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request().query('SELECT * FROM dbo.roles ORDER BY name ASC');
        return result.recordset.map(mapRole);
    }
    async findRoleByName(name) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('name', mssql_1.default.NVarChar(100), name)
            .query('SELECT TOP 1 * FROM dbo.roles WHERE name = @name');
        return result.recordset[0] ? mapRole(result.recordset[0]) : null;
    }
    async createRole(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('name', mssql_1.default.NVarChar(100), input.name)
            .input('description', mssql_1.default.NVarChar(255), input.description ?? null)
            .query(`
        INSERT INTO dbo.roles (name, description)
        OUTPUT INSERTED.*
        VALUES (@name, @description)
      `);
        return mapRole(result.recordset[0]);
    }
    async updateRole(id, input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('id', mssql_1.default.UniqueIdentifier, id)
            .input('name', mssql_1.default.NVarChar(100), input.name ?? null)
            .input('description', mssql_1.default.NVarChar(255), input.description ?? null)
            .input('descriptionProvided', mssql_1.default.Bit, Object.prototype.hasOwnProperty.call(input, 'description'))
            .query(`
        UPDATE dbo.roles
        SET
          name = COALESCE(@name, name),
          description = CASE WHEN @descriptionProvided = 1 THEN @description ELSE description END,
          updated_at = SYSUTCDATETIME()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);
        return result.recordset[0] ? mapRole(result.recordset[0]) : null;
    }
    async assignRoleToUser(userId, roleId) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('roleId', mssql_1.default.UniqueIdentifier, roleId)
            .query(`
        IF NOT EXISTS (
          SELECT 1 FROM dbo.user_roles WHERE user_id = @userId AND role_id = @roleId
        )
        BEGIN
          INSERT INTO dbo.user_roles (user_id, role_id) VALUES (@userId, @roleId)
        END
      `);
    }
    async assignRoleToUserByName(userId, roleName) {
        const role = await this.findRoleByName(roleName);
        if (!role) {
            return;
        }
        await this.assignRoleToUser(userId, role.id);
    }
    async removeRolesFromUserByNames(userId, roleNames) {
        if (roleNames.length === 0) {
            return;
        }
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .input('roleNames', mssql_1.default.NVarChar(mssql_1.default.MAX), JSON.stringify(roleNames))
            .query(`
        DELETE ur
        FROM dbo.user_roles ur
        INNER JOIN dbo.roles r ON r.id = ur.role_id
        INNER JOIN OPENJSON(@roleNames) WITH (name NVARCHAR(100) '$') input_roles
          ON input_roles.name = r.name
        WHERE ur.user_id = @userId
      `);
    }
    async listPermissions() {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .query('SELECT * FROM dbo.permissions ORDER BY name ASC');
        return result.recordset.map(mapPermission);
    }
    async createPermission(input) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('name', mssql_1.default.NVarChar(150), input.name)
            .input('description', mssql_1.default.NVarChar(255), input.description ?? null)
            .query(`
        INSERT INTO dbo.permissions (name, description)
        OUTPUT INSERTED.*
        VALUES (@name, @description)
      `);
        return mapPermission(result.recordset[0]);
    }
    async assignPermissionsToRole(roleId, permissionIds) {
        const pool = await (0, database_1.getSqlPool)();
        const transaction = pool.transaction();
        await transaction.begin();
        try {
            for (const permissionId of permissionIds) {
                await transaction
                    .request()
                    .input('roleId', mssql_1.default.UniqueIdentifier, roleId)
                    .input('permissionId', mssql_1.default.UniqueIdentifier, permissionId)
                    .query(`
            IF NOT EXISTS (
              SELECT 1 FROM dbo.role_permissions
              WHERE role_id = @roleId AND permission_id = @permissionId
            )
            BEGIN
              INSERT INTO dbo.role_permissions (role_id, permission_id)
              VALUES (@roleId, @permissionId)
            END
          `);
            }
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async getUserPermissions(userId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, userId)
            .query(`
        SELECT DISTINCT p.name
        FROM dbo.permissions p
        INNER JOIN dbo.role_permissions rp ON rp.permission_id = p.id
        INNER JOIN dbo.user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = @userId
        ORDER BY p.name ASC
      `);
        return result.recordset.map((row) => row.name);
    }
    async createRefreshToken(input) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('userId', mssql_1.default.UniqueIdentifier, input.userId)
            .input('tokenHash', mssql_1.default.NVarChar(128), input.tokenHash)
            .input('expiresAt', mssql_1.default.DateTime2, input.expiresAt)
            .query(`
        INSERT INTO dbo.refresh_tokens (user_id, token_hash, expires_at)
        VALUES (@userId, @tokenHash, @expiresAt)
      `);
    }
    async findRefreshTokenByHash(tokenHash) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool
            .request()
            .input('tokenHash', mssql_1.default.NVarChar(128), tokenHash)
            .query('SELECT TOP 1 * FROM dbo.refresh_tokens WHERE token_hash = @tokenHash');
        return result.recordset[0] ?? null;
    }
    async revokeRefreshToken(tokenHash) {
        const pool = await (0, database_1.getSqlPool)();
        await pool
            .request()
            .input('tokenHash', mssql_1.default.NVarChar(128), tokenHash)
            .query(`
        UPDATE dbo.refresh_tokens
        SET revoked_at = SYSUTCDATETIME()
        WHERE token_hash = @tokenHash AND revoked_at IS NULL
      `);
    }
}
exports.IamRepository = IamRepository;
//# sourceMappingURL=iam.repository.js.map