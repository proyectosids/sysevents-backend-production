"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationUsageRepository = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
class TranslationUsageRepository {
    async reserveCharacters(usageMonth, requestedCharacters, monthlyLimit) {
        if (requestedCharacters <= 0)
            return true;
        const pool = await (0, database_1.getSqlPool)();
        const transaction = new mssql_1.default.Transaction(pool);
        await transaction.begin(mssql_1.default.ISOLATION_LEVEL.SERIALIZABLE);
        try {
            await transaction.request()
                .input('usageMonth', mssql_1.default.Char(7), usageMonth)
                .query(`
          IF NOT EXISTS (
            SELECT 1 FROM dbo.translation_monthly_usage WITH (UPDLOCK, HOLDLOCK)
            WHERE usage_month = @usageMonth
          )
          BEGIN
            INSERT INTO dbo.translation_monthly_usage (usage_month, characters_used)
            VALUES (@usageMonth, 0);
          END;
        `);
            const result = await transaction.request()
                .input('usageMonth', mssql_1.default.Char(7), usageMonth)
                .input('requestedCharacters', mssql_1.default.Int, requestedCharacters)
                .input('monthlyLimit', mssql_1.default.Int, monthlyLimit)
                .query(`
          UPDATE dbo.translation_monthly_usage
          SET characters_used = characters_used + @requestedCharacters,
              updated_at = SYSUTCDATETIME()
          WHERE usage_month = @usageMonth
            AND characters_used + @requestedCharacters <= @monthlyLimit;

          SELECT CAST(CASE WHEN @@ROWCOUNT = 1 THEN 1 ELSE 0 END AS INT) AS reserved;
        `);
            await transaction.commit();
            return result.recordset[0]?.reserved === 1;
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    async releaseCharacters(usageMonth, characters) {
        if (characters <= 0)
            return;
        const pool = await (0, database_1.getSqlPool)();
        await pool.request()
            .input('usageMonth', mssql_1.default.Char(7), usageMonth)
            .input('characters', mssql_1.default.Int, characters)
            .query(`
        UPDATE dbo.translation_monthly_usage
        SET characters_used = CASE
              WHEN characters_used >= @characters THEN characters_used - @characters
              ELSE 0
            END,
            updated_at = SYSUTCDATETIME()
        WHERE usage_month = @usageMonth;
      `);
    }
}
exports.TranslationUsageRepository = TranslationUsageRepository;
//# sourceMappingURL=translation-usage.repository.js.map