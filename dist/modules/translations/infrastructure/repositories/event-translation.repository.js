"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTranslationRepository = void 0;
exports.translationSourceHash = translationSourceHash;
const crypto_1 = require("crypto");
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../../../config/database");
function translationSourceHash(text) {
    return (0, crypto_1.createHash)('sha256').update(text, 'utf8').digest('hex');
}
class EventTranslationRepository {
    async findMany(eventId, targetLanguage) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('targetLanguage', mssql_1.default.NVarChar(10), targetLanguage)
            .query(`
        SELECT source_text, translated_text
        FROM dbo.event_site_translations
        WHERE event_id = @eventId AND target_language = @targetLanguage
      `);
        return result.recordset.reduce((translations, row) => {
            translations[row.source_text] = row.translated_text;
            return translations;
        }, {});
    }
    async upsertMany(eventId, targetLanguage, translations, provider = 'google-cloud') {
        const entries = Object.entries(translations);
        if (!entries.length)
            return;
        const pool = await (0, database_1.getSqlPool)();
        const transaction = new mssql_1.default.Transaction(pool);
        await transaction.begin();
        try {
            for (const [source, translated] of entries) {
                await transaction.request()
                    .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
                    .input('targetLanguage', mssql_1.default.NVarChar(10), targetLanguage)
                    .input('sourceHash', mssql_1.default.Char(64), translationSourceHash(source))
                    .input('sourceText', mssql_1.default.NVarChar(mssql_1.default.MAX), source)
                    .input('translatedText', mssql_1.default.NVarChar(mssql_1.default.MAX), translated)
                    .input('provider', mssql_1.default.NVarChar(40), provider)
                    .query(`
            UPDATE dbo.event_site_translations
            SET source_text = @sourceText,
                translated_text = @translatedText,
                provider = @provider,
                updated_at = SYSUTCDATETIME()
            WHERE event_id = @eventId
              AND target_language = @targetLanguage
              AND source_hash = @sourceHash;

            IF @@ROWCOUNT = 0
            BEGIN
              INSERT INTO dbo.event_site_translations (
                event_id, source_language, target_language, source_hash,
                source_text, translated_text, provider
              ) VALUES (
                @eventId, 'es', @targetLanguage, @sourceHash,
                @sourceText, @translatedText, @provider
              );
            END;
          `);
            }
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}
exports.EventTranslationRepository = EventTranslationRepository;
//# sourceMappingURL=event-translation.repository.js.map