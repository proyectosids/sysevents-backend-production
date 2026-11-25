"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationCacheService = exports.GoogleCloudTranslationProvider = void 0;
exports.translateGroupWithGoogle = translateGroupWithGoogle;
exports.translateWithGoogle = translateWithGoogle;
exports.collectTranslatableStrings = collectTranslatableStrings;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("../../../config/env");
const logger_1 = require("../../../shared/logger/logger");
const event_translation_repository_1 = require("../infrastructure/repositories/event-translation.repository");
const translation_usage_repository_1 = require("../infrastructure/repositories/translation-usage.repository");
const translation_month_1 = require("./translation-month");
const TRANSLATION_CACHE_DIR = path_1.default.resolve(env_1.env.FILE_STORAGE_PATH, 'i18n-cache');
const GOOGLE_CLOUD_TRANSLATION_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
function normalizeText(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function decodeBasicHtml(value) {
    const named = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ',
    };
    return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
        if (code.startsWith('#x'))
            return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
        if (code.startsWith('#'))
            return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
        return named[code.toLowerCase()] ?? entity;
    });
}
function isProtectedValue(value) {
    const text = normalizeText(value);
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text))
        return true;
    if (/^(?:https?:\/\/|www\.)/i.test(text))
        return true;
    if (/\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/i.test(text))
        return true;
    if (/\b(?:folio|orden|order)\s+[A-Z0-9-]{4,}\b/i.test(text))
        return true;
    if (/^[A-Z0-9-]{6,}$/.test(text))
        return true;
    if (/^\+?\d[\d\s().-]{6,}$/.test(text))
        return true;
    if (/^#[0-9a-f]{3,8}$/i.test(text))
        return true;
    if (/^[\w./\\-]+\.(?:html?|css|js|json|png|jpe?g|webp|svg|pdf|docx?|pptx?|xlsx?)$/i.test(text))
        return true;
    return false;
}
function isTranslatableText(value) {
    const normalized = normalizeText(value);
    if (normalized.length < 2 || normalized.length > 10_000)
        return false;
    if (isProtectedValue(normalized))
        return false;
    if (/^[\d\s.,:;+\-/$%()]+$/.test(normalized))
        return false;
    return /\p{L}/u.test(normalized);
}
function uniqueTranslatableTexts(texts) {
    return [...new Set(texts.map(normalizeText).filter(isTranslatableText))];
}
async function readJson(filePath) {
    try {
        return JSON.parse(await fs_1.promises.readFile(filePath, 'utf8'));
    }
    catch {
        return {};
    }
}
async function writeJson(filePath, data) {
    await fs_1.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
        await fs_1.promises.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        await fs_1.promises.rename(temporaryPath, filePath);
    }
    finally {
        await fs_1.promises.rm(temporaryPath, { force: true }).catch(() => undefined);
    }
}
async function translateGroupWithGoogle(texts, targetLanguage, apiKey = env_1.env.GOOGLE_CLOUD_TRANSLATION_API_KEY) {
    if (!apiKey)
        throw new Error('GOOGLE_CLOUD_TRANSLATION_API_KEY is not configured');
    if (!texts.length)
        return new Map();
    const endpoint = `${GOOGLE_CLOUD_TRANSLATION_ENDPOINT}?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ q: texts, source: 'es', target: targetLanguage, format: 'html' }),
    });
    if (!response.ok)
        throw new Error(`Google Cloud Translation returned ${response.status}`);
    const payload = await response.json();
    const translatedItems = payload.data?.translations ?? [];
    if (translatedItems.length !== texts.length) {
        throw new Error('Google Cloud Translation returned an incomplete response');
    }
    return texts.reduce((translations, source, index) => {
        const translated = normalizeText(decodeBasicHtml(translatedItems[index]?.translatedText ?? ''));
        if (translated)
            translations.set(source, translated);
        return translations;
    }, new Map());
}
async function translateWithGoogle(text, targetLanguage, apiKey = env_1.env.GOOGLE_CLOUD_TRANSLATION_API_KEY) {
    const translations = await translateGroupWithGoogle([text], targetLanguage, apiKey);
    const translated = translations.get(text);
    if (!translated)
        throw new Error('Google Cloud Translation returned an empty response');
    return translated;
}
function groupByLimits(texts, characterLimit = 20_000, itemLimit = 100) {
    const groups = [];
    let current = [];
    let currentLength = 0;
    texts.forEach((text) => {
        if (current.length && (current.length >= itemLimit || currentLength + text.length > characterLimit)) {
            groups.push(current);
            current = [];
            currentLength = 0;
        }
        current.push(text);
        currentLength += text.length;
    });
    if (current.length)
        groups.push(current);
    return groups;
}
class GoogleCloudTranslationProvider {
    usageRepository;
    options;
    constructor(usageRepository = new translation_usage_repository_1.TranslationUsageRepository(), options = {
        enabled: env_1.env.GOOGLE_CLOUD_TRANSLATION_ENABLED,
        apiKey: env_1.env.GOOGLE_CLOUD_TRANSLATION_API_KEY,
        monthlyCharacterLimit: env_1.env.GOOGLE_CLOUD_TRANSLATION_MONTHLY_CHARACTER_LIMIT,
    }) {
        this.usageRepository = usageRepository;
        this.options = options;
    }
    async translateMany(texts, targetLanguage) {
        const translations = {};
        if (!this.options.enabled)
            return translations;
        if (!this.options.apiKey)
            throw new Error('GOOGLE_CLOUD_TRANSLATION_API_KEY is not configured');
        for (const group of groupByLimits(texts)) {
            const usageMonth = (0, translation_month_1.currentTranslationUsageMonth)();
            const characterCount = group.reduce((total, text) => total + text.length, 0);
            const reserved = await this.usageRepository.reserveCharacters(usageMonth, characterCount, this.options.monthlyCharacterLimit);
            if (!reserved) {
                logger_1.logger.warn('Monthly Google translation character limit reached', {
                    usageMonth,
                    monthlyCharacterLimit: this.options.monthlyCharacterLimit,
                    rejectedCharacters: characterCount,
                });
                break;
            }
            try {
                const resolved = await translateGroupWithGoogle(group, targetLanguage, this.options.apiKey);
                resolved.forEach((translated, source) => {
                    if (normalizeText(translated) !== source)
                        translations[source] = translated;
                });
            }
            catch (error) {
                await this.usageRepository.releaseCharacters(usageMonth, characterCount).catch(() => undefined);
                throw error;
            }
        }
        return translations;
    }
}
exports.GoogleCloudTranslationProvider = GoogleCloudTranslationProvider;
function collectTranslatableStrings(value) {
    const collected = [];
    const technicalKey = /^(?:id|eventId|pageId|sectionId|fileId|.*FileId|.*Url|url|href|src|slug|status|target|objectType|sectionType|type|variant|align|position|className|sourceFile|sourceThemeKey|sourceThemeId|color|.*Color|fontFamily|fontWeight)$/i;
    const visit = (candidate, key = '') => {
        if (technicalKey.test(key))
            return;
        if (typeof candidate === 'string') {
            const fragments = /<[^>]+>/.test(candidate)
                ? decodeBasicHtml(candidate
                    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                    .replace(/<[^>]+>/g, '\n')).split(/\r?\n/)
                : [candidate];
            fragments.forEach((fragment) => {
                const normalized = normalizeText(fragment);
                if (isTranslatableText(normalized))
                    collected.push(normalized);
            });
            return;
        }
        if (Array.isArray(candidate)) {
            candidate.forEach((item) => visit(item, key));
            return;
        }
        if (candidate && typeof candidate === 'object') {
            Object.entries(candidate).forEach(([childKey, child]) => visit(child, childKey));
        }
    };
    visit(value);
    return [...new Set(collected)];
}
class TranslationCacheService {
    repository;
    provider;
    languageQueues = new Map();
    constructor(repository = new event_translation_repository_1.EventTranslationRepository(), provider = new GoogleCloudTranslationProvider()) {
        this.repository = repository;
        this.provider = provider;
    }
    async translateMany(texts, targetLanguage, eventId) {
        const queueKey = `${eventId ?? 'global'}:${targetLanguage}`;
        const previous = this.languageQueues.get(queueKey) ?? Promise.resolve();
        let releaseQueue;
        const current = new Promise((resolve) => { releaseQueue = resolve; });
        const queued = previous.then(() => current);
        this.languageQueues.set(queueKey, queued);
        await previous;
        try {
            return await this.translateManyExclusive(texts, targetLanguage, eventId);
        }
        finally {
            releaseQueue();
            if (this.languageQueues.get(queueKey) === queued)
                this.languageQueues.delete(queueKey);
        }
    }
    async translateManyExclusive(texts, targetLanguage, eventId) {
        const uniqueTexts = uniqueTranslatableTexts(texts);
        const filePath = path_1.default.join(TRANSLATION_CACHE_DIR, `${targetLanguage}.json`);
        const fileCache = await readJson(filePath);
        let persistentCache = {};
        if (eventId) {
            try {
                persistentCache = await this.repository.findMany(eventId, targetLanguage);
            }
            catch (error) {
                logger_1.logger.warn('Persistent translation cache is unavailable', {
                    eventId,
                    targetLanguage,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        const cache = { ...fileCache, ...persistentCache };
        const fileBackfill = uniqueTexts.reduce((result, text) => {
            if (!persistentCache[text] && fileCache[text] && normalizeText(fileCache[text]) !== text) {
                result[text] = fileCache[text];
            }
            return result;
        }, {});
        const missingTexts = uniqueTexts.filter((text) => !cache[text] || normalizeText(cache[text]) === text);
        let generated = {};
        if (missingTexts.length) {
            try {
                generated = await this.provider.translateMany(missingTexts, targetLanguage);
            }
            catch (error) {
                logger_1.logger.warn('Official translation provider could not resolve content', {
                    eventId,
                    targetLanguage,
                    textCount: missingTexts.length,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        Object.assign(cache, generated);
        if (Object.keys(generated).length) {
            await writeJson(filePath, { ...fileCache, ...generated }).catch(() => undefined);
            if (eventId) {
                await this.repository.upsertMany(eventId, targetLanguage, { ...fileBackfill, ...generated }).catch((error) => {
                    logger_1.logger.warn('Generated translations could not be persisted in SQL', {
                        eventId,
                        targetLanguage,
                        error: error instanceof Error ? error.message : String(error),
                    });
                });
            }
        }
        else if (eventId && Object.keys(fileBackfill).length) {
            await this.repository.upsertMany(eventId, targetLanguage, fileBackfill).catch(() => undefined);
        }
        return uniqueTexts.reduce((result, text) => {
            result[text] = cache[text] ?? text;
            return result;
        }, {});
    }
    async restoreMany(texts, sourceLanguage, eventId) {
        const filePath = path_1.default.join(TRANSLATION_CACHE_DIR, `${sourceLanguage}.json`);
        const fileCache = await readJson(filePath);
        let persistentCache = {};
        if (eventId)
            persistentCache = await this.repository.findMany(eventId, sourceLanguage).catch(() => ({}));
        const inverted = Object.entries({ ...fileCache, ...persistentCache }).reduce((result, [spanish, translated]) => {
            result[normalizeText(translated)] = spanish;
            return result;
        }, {});
        return uniqueTranslatableTexts(texts).reduce((result, text) => {
            if (inverted[text])
                result[text] = inverted[text];
            return result;
        }, {});
    }
    queueEventPretranslation(eventId, content, targetLanguages = ['en', 'fr']) {
        const texts = collectTranslatableStrings(content);
        if (!texts.length)
            return;
        void Promise.all(targetLanguages.map((language) => this.translateMany(texts, language, eventId)))
            .then(() => logger_1.logger.info('Event translations prepared', { eventId, textCount: texts.length, targetLanguages }))
            .catch((error) => logger_1.logger.warn('Event translation preparation did not complete', {
            eventId,
            error: error instanceof Error ? error.message : String(error),
        }));
    }
}
exports.TranslationCacheService = TranslationCacheService;
//# sourceMappingURL=translation-cache.service.js.map