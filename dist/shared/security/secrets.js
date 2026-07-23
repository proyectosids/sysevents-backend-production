"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.secretLast4 = secretLast4;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
const app_error_1 = require("../errors/app-error");
const algorithm = 'aes-256-gcm';
function keyFromEnv() {
    if (!env_1.env.APP_SECRETS_KEY) {
        throw new app_error_1.AppError('Secret encryption key is not configured', 503, 'SECRETS_KEY_NOT_CONFIGURED');
    }
    return crypto_1.default.createHash('sha256').update(env_1.env.APP_SECRETS_KEY).digest();
}
function encryptSecret(value) {
    if (!value)
        return null;
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv(algorithm, keyFromEnv(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
        'v1',
        iv.toString('base64url'),
        tag.toString('base64url'),
        encrypted.toString('base64url'),
    ].join(':');
}
function decryptSecret(value) {
    if (!value)
        return null;
    const [version, ivText, tagText, encryptedText] = value.split(':');
    if (version !== 'v1' || !ivText || !tagText || !encryptedText) {
        throw new app_error_1.AppError('Invalid encrypted secret payload', 500, 'INVALID_SECRET_PAYLOAD');
    }
    const decipher = crypto_1.default.createDecipheriv(algorithm, keyFromEnv(), Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedText, 'base64url')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
function secretLast4(value) {
    if (!value)
        return null;
    return value.slice(-4);
}
//# sourceMappingURL=secrets.js.map