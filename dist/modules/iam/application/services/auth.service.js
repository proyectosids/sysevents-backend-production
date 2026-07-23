"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../../../config/env");
const app_error_1 = require("../../../../shared/errors/app-error");
const iam_repository_1 = require("../../infrastructure/repositories/iam.repository");
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
function parseDurationMs(value) {
    const match = /^(\d+)([mhd])$/.exec(value);
    if (!match) {
        return 7 * 24 * 60 * 60 * 1000;
    }
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === 'm')
        return amount * 60 * 1000;
    if (unit === 'h')
        return amount * 60 * 60 * 1000;
    return amount * 24 * 60 * 60 * 1000;
}
class AuthService {
    iamRepository;
    constructor(iamRepository = new iam_repository_1.IamRepository()) {
        this.iamRepository = iamRepository;
    }
    async register(input, options = {}) {
        const existingUser = await this.iamRepository.findUserByEmail(input.email);
        if (existingUser) {
            throw new app_error_1.AppError('Email is already registered', 409, 'EMAIL_ALREADY_REGISTERED');
        }
        const usersCount = await this.iamRepository.countUsers();
        const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
        const user = await this.iamRepository.createUser({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
        });
        if (options.assignPlatformAdminIfFirstUser !== false && usersCount === 0) {
            const adminRole = await this.iamRepository.findRoleByName('platform_admin');
            if (adminRole) {
                await this.iamRepository.assignRoleToUser(user.id, adminRole.id);
            }
        }
        return user;
    }
    async registerOrAuthenticateExisting(input) {
        const existingUser = await this.iamRepository.findUserByEmail(input.email);
        if (!existingUser) {
            return this.register(input, { assignPlatformAdminIfFirstUser: false });
        }
        if (existingUser.status !== 'active') {
            throw new app_error_1.AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
        const passwordMatches = await bcryptjs_1.default.compare(input.password, existingUser.passwordHash);
        if (!passwordMatches) {
            throw new app_error_1.AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
        return {
            id: existingUser.id,
            email: existingUser.email,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            status: existingUser.status,
            createdAt: existingUser.createdAt,
            updatedAt: existingUser.updatedAt,
        };
    }
    async login(email, password) {
        const user = await this.iamRepository.findUserByEmail(email);
        if (!user || user.status !== 'active') {
            throw new app_error_1.AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
        const passwordMatches = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!passwordMatches) {
            throw new app_error_1.AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
        }
        return this.createSession(user.id, user.email);
    }
    async refresh(refreshToken) {
        const tokenHash = hashToken(refreshToken);
        const storedToken = await this.iamRepository.findRefreshTokenByHash(tokenHash);
        if (!storedToken || storedToken.revoked_at || storedToken.expires_at <= new Date()) {
            throw new app_error_1.AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }
        const user = await this.iamRepository.findUserById(storedToken.user_id);
        if (!user || user.status !== 'active') {
            throw new app_error_1.AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
        }
        await this.iamRepository.revokeRefreshToken(tokenHash);
        return this.createSession(user.id, user.email);
    }
    async logout(refreshToken) {
        await this.iamRepository.revokeRefreshToken(hashToken(refreshToken));
    }
    async issueSessionForUser(userId) {
        const user = await this.iamRepository.findUserById(userId);
        if (!user || user.status !== 'active') {
            throw new app_error_1.AppError('User not found', 404, 'USER_NOT_FOUND');
        }
        return this.createSession(user.id, user.email);
    }
    verifyAccessToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
            if (!payload.sub || !payload.email) {
                throw new app_error_1.AppError('Invalid token', 401, 'INVALID_TOKEN');
            }
            return payload;
        }
        catch (error) {
            if (error instanceof app_error_1.AppError) {
                throw error;
            }
            throw new app_error_1.AppError('Invalid token', 401, 'INVALID_TOKEN');
        }
    }
    async createSession(userId, email) {
        const permissions = await this.iamRepository.getUserPermissions(userId);
        const accessToken = jsonwebtoken_1.default.sign({ email, permissions }, env_1.env.JWT_SECRET, {
            subject: userId,
            expiresIn: env_1.env.JWT_EXPIRES_IN,
        });
        const refreshToken = crypto_1.default.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + parseDurationMs(env_1.env.JWT_REFRESH_EXPIRES_IN));
        await this.iamRepository.createRefreshToken({
            userId,
            tokenHash: hashToken(refreshToken),
            expiresAt,
        });
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: env_1.env.JWT_EXPIRES_IN,
            refreshExpiresAt: expiresAt,
        };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map