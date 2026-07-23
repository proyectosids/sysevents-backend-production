"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSqlPool = getSqlPool;
exports.testDatabaseConnection = testDatabaseConnection;
const mssql_1 = __importDefault(require("mssql"));
const env_1 = require("./env");
let pool = null;
const sqlConfig = {
    server: env_1.env.DB_HOST,
    port: env_1.env.DB_PORT,
    user: env_1.env.DB_USER,
    password: env_1.env.DB_PASSWORD,
    database: env_1.env.DB_NAME,
    options: {
        encrypt: env_1.env.DB_ENCRYPT,
        trustServerCertificate: env_1.env.DB_TRUST_SERVER_CERTIFICATE,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};
async function getSqlPool() {
    if (pool?.connected) {
        return pool;
    }
    pool = await new mssql_1.default.ConnectionPool(sqlConfig).connect();
    return pool;
}
async function testDatabaseConnection() {
    const connectedPool = await getSqlPool();
    await connectedPool.request().query('SELECT 1 AS ok');
}
//# sourceMappingURL=database.js.map