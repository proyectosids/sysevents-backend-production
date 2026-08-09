"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Solo cargar archivo .env fuera de producción
if (process.env.NODE_ENV !== 'production') {
    const envPath = path_1.default.resolve(__dirname, '../../.env');
    dotenv_1.default.config({
        path: envPath,
        quiet: true,
    });
}
const envSchema = zod_1.z.object({
    APP_NAME: zod_1.z.string().default('SysEvents API'),
    NODE_ENV: zod_1.z
        .enum(['development', 'test', 'production'])
        .default('development'),
    SERVER_HOST: zod_1.z.string().min(1).default('0.0.0.0'),
    PORT: zod_1.z.coerce
        .number()
        .int()
        .min(1)
        .max(65535)
        .default(3000),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
    APP_PUBLIC_URL: zod_1.z
        .string()
        .url()
        .default('http://localhost:5173'),
    APP_API_URL: zod_1.z
        .string()
        .url()
        .default('http://localhost:5003'),
    JWT_SECRET: zod_1.z.string().min(10),
    JWT_EXPIRES_IN: zod_1.z.string().default('1d'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    APP_SECRETS_KEY: zod_1.z.string().optional(),
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z.coerce
        .number()
        .default(1433),
    DB_USER: zod_1.z.string().default('sa'),
    DB_PASSWORD: zod_1.z.string().default(''),
    DB_NAME: zod_1.z.string().default('sysevents_db'),
    DB_ENCRYPT: zod_1.z.coerce
        .boolean()
        .default(false),
    DB_TRUST_SERVER_CERTIFICATE: zod_1.z.coerce
        .boolean()
        .default(true),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    MERCADOPAGO_ACCESS_TOKEN: zod_1.z.string().optional(),
    FILE_STORAGE_PATH: zod_1.z.string().default('storage'),
    MAX_UPLOAD_SIZE_MB: zod_1.z.coerce
        .number()
        .default(20),
    ALLOWED_UPLOAD_MIME_TYPES: zod_1.z
        .string()
        .default('application/pdf,image/png,image/jpeg,image/webp,application/zip,application/x-zip-compressed,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce
        .number()
        .default(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASSWORD: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().email().optional(),
    AUTH_EMAIL: zod_1.z.string().email().optional(),
    AUTH_PASS: zod_1.z.string().optional(),
    AUTH_PASS_APP: zod_1.z.string().optional(),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce
        .number()
        .default(60000),
    RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce
        .number()
        .default(120),
    LOGIN_RATE_LIMIT_MAX_REQUESTS: zod_1.z.coerce
        .number()
        .default(5),
    TEST_DB_NAME: zod_1.z.string().optional(),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsedEnv.data;
//# sourceMappingURL=env.js.map