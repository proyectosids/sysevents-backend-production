"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function serializeContext(context) {
    return context ? ` ${JSON.stringify(context)}` : '';
}
exports.logger = {
    info(message, context) {
        console.info(`[INFO] ${message}${serializeContext(context)}`);
    },
    warn(message, context) {
        console.warn(`[WARN] ${message}${serializeContext(context)}`);
    },
    error(message, context) {
        console.error(`[ERROR] ${message}${serializeContext(context)}`);
    },
};
//# sourceMappingURL=logger.js.map