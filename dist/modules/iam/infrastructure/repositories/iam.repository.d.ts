import { Permission } from '../../domain/entities/permission';
import { Role } from '../../domain/entities/role';
import { User, UserStatus, UserWithPassword } from '../../domain/entities/user';
type RefreshTokenRow = {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    revoked_at: Date | null;
};
export declare class IamRepository {
    countUsers(): Promise<number>;
    createUser(input: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        status?: UserStatus;
    }): Promise<User>;
    findUserByEmail(email: string): Promise<UserWithPassword | null>;
    findUserById(id: string): Promise<User | null>;
    findUserWithPasswordById(id: string): Promise<UserWithPassword | null>;
    listUsers(): Promise<User[]>;
    updateUser(id: string, input: Partial<Pick<User, 'email' | 'firstName' | 'lastName' | 'status'>>): Promise<User | null>;
    updatePassword(id: string, passwordHash: string): Promise<User | null>;
    listRoles(): Promise<Role[]>;
    findRoleByName(name: string): Promise<Role | null>;
    createRole(input: {
        name: string;
        description?: string;
    }): Promise<Role>;
    updateRole(id: string, input: {
        name?: string;
        description?: string | null;
    }): Promise<Role | null>;
    assignRoleToUser(userId: string, roleId: string): Promise<void>;
    assignRoleToUserByName(userId: string, roleName: string): Promise<void>;
    removeRolesFromUserByNames(userId: string, roleNames: string[]): Promise<void>;
    listPermissions(): Promise<Permission[]>;
    createPermission(input: {
        name: string;
        description?: string;
    }): Promise<Permission>;
    assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void>;
    getUserPermissions(userId: string): Promise<string[]>;
    createRefreshToken(input: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<void>;
    findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow>;
    revokeRefreshToken(tokenHash: string): Promise<void>;
}
export {};
