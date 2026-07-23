"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
const logger_1 = require("../shared/logger/logger");
const migrationsPath = path_1.default.resolve(__dirname, '../../database/migrations');
async function ensureSchemaMigrationsTable() {
    const pool = await (0, database_1.getSqlPool)();
    await pool.request().query(`
    IF OBJECT_ID('dbo.schema_migrations', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.schema_migrations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        filename NVARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END
  `);
}
async function getExecutedMigrations() {
    const pool = await (0, database_1.getSqlPool)();
    const result = await pool.request().query('SELECT filename FROM dbo.schema_migrations ORDER BY filename ASC');
    return new Set(result.recordset.map((row) => row.filename));
}
async function runMigration(filename, sqlText) {
    const pool = await (0, database_1.getSqlPool)();
    const transaction = pool.transaction();
    await transaction.begin();
    try {
        await transaction.request().batch(sqlText);
        await transaction
            .request()
            .input('filename', filename)
            .query('INSERT INTO dbo.schema_migrations (filename) VALUES (@filename)');
        await transaction.commit();
        logger_1.logger.info('Migration executed', { filename });
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
}
async function main() {
    await ensureSchemaMigrationsTable();
    const files = (await promises_1.default.readdir(migrationsPath))
        .filter((file) => file.endsWith('.sql'))
        .sort();
    const executedMigrations = await getExecutedMigrations();
    for (const file of files) {
        if (executedMigrations.has(file)) {
            logger_1.logger.info('Migration skipped', { filename: file });
            continue;
        }
        const sqlText = await promises_1.default.readFile(path_1.default.join(migrationsPath, file), 'utf8');
        await runMigration(file, sqlText);
    }
    logger_1.logger.info('Migrations completed');
}
main().catch((error) => {
    logger_1.logger.error('Migration failed', {
        error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map