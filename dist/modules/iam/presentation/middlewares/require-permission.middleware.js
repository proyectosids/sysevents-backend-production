"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const app_error_1 = require("../../../../shared/errors/app-error");
function requirePermission(permission) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new app_error_1.AppError('Authentication is required', 401, 'UNAUTHORIZED'));
        }
        if (!req.user.permissions.includes(permission)) {
            return next(new app_error_1.AppError('Permission denied', 403, 'FORBIDDEN'));
        }
        return next();
    };
}
//# sourceMappingURL=require-permission.middleware.js.map