"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthenticateMiddleware = optionalAuthenticateMiddleware;
const auth_service_1 = require("../../application/services/auth.service");
const iam_repository_1 = require("../../infrastructure/repositories/iam.repository");
const authService = new auth_service_1.AuthService();
const iamRepository = new iam_repository_1.IamRepository();
async function optionalAuthenticateMiddleware(req, _res, next) {
    try {
        const authorization = req.headers.authorization;
        if (!authorization?.startsWith('Bearer ')) {
            return next();
        }
        const token = authorization.replace('Bearer ', '').trim();
        const payload = authService.verifyAccessToken(token);
        const user = await iamRepository.findUserById(payload.sub);
        if (!user || user.status !== 'active') {
            return next();
        }
        req.user = {
            id: user.id,
            email: user.email,
            permissions: await iamRepository.getUserPermissions(user.id),
        };
        return next();
    }
    catch {
        return next();
    }
}
//# sourceMappingURL=optional-authenticate.middleware.js.map