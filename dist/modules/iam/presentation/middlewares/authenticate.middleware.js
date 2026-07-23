"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateMiddleware = authenticateMiddleware;
const app_error_1 = require("../../../../shared/errors/app-error");
const auth_service_1 = require("../../application/services/auth.service");
const iam_repository_1 = require("../../infrastructure/repositories/iam.repository");
const authService = new auth_service_1.AuthService();
const iamRepository = new iam_repository_1.IamRepository();
async function authenticateMiddleware(req, _res, next) {
    try {
        const authorization = req.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) {
            throw new app_error_1.AppError('Authentication token is required', 401, 'UNAUTHORIZED');
        }
        const token = authorization.replace('Bearer ', '').trim();
        const payload = authService.verifyAccessToken(token);
        const user = await iamRepository.findUserById(payload.sub);
        if (!user || user.status !== 'active') {
            throw new app_error_1.AppError('Authentication token is invalid', 401, 'UNAUTHORIZED');
        }
        req.user = {
            id: user.id,
            email: user.email,
            permissions: await iamRepository.getUserPermissions(user.id),
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=authenticate.middleware.js.map