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
    async getEventStats(eventId) {
        const pool = await (0, database_1.getSqlPool)();
        const result = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .query(`
        SELECT
          target_language,
          COUNT(1) AS translation_count,
          COALESCE(SUM(LEN(source_text)), 0) AS source_characters,
          COALESCE(SUM(LEN(translated_text)), 0) AS translated_characters,
          MAX(updated_at) AS last_updated_at
        FROM dbo.event_site_translations
        WHERE event_id = @eventId
        GROUP BY target_language
        ORDER BY target_language;
      `);
        return result.recordset.map((row) => ({
            targetLanguage: row.target_language,
            translationCount: row.translation_count,
            sourceCharacters: row.source_characters,
            translatedCharacters: row.translated_characters,
            lastUpdatedAt: row.last_updated_at,
        }));
    }
    async listEventTranslations(eventId, input) {
        const pool = await (0, database_1.getSqlPool)();
        const request = pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('targetLanguage', mssql_1.default.NVarChar(10), input.targetLanguage ?? null)
            .input('limit', mssql_1.default.Int, input.limit)
            .input('offset', mssql_1.default.Int, input.offset);
        const count = await request.query(`
      SELECT COUNT(1) AS total
      FROM dbo.event_site_translations
      WHERE event_id = @eventId
        AND (@targetLanguage IS NULL OR target_language = @targetLanguage);
    `);
        const rows = await pool.request()
            .input('eventId', mssql_1.default.UniqueIdentifier, eventId)
            .input('targetLanguage', mssql_1.default.NVarChar(10), input.targetLanguage ?? null)
            .input('limit', mssql_1.default.Int, input.limit)
            .input('offset', mssql_1.default.Int, input.offset)
            .query(`
        SELECT id, source_language, target_language, source_text, translated_text,
          provider, created_at, updated_at
        FROM dbo.event_site_translations
        WHERE event_id = @eventId
          AND (@targetLanguage IS NULL OR target_language = @targetLanguage)
        ORDER BY updated_at DESC, id DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
      `);
        return {
            total: count.recordset[0]?.total ?? 0,
            items: rows.recordset.map((row) => ({
                id: row.id,
                sourceLanguage: row.source_language,
                targetLanguage: row.target_language,
                sourceText: row.source_text,
                translatedText: row.translated_text,
                provider: row.provider,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            })),
        };
    }
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