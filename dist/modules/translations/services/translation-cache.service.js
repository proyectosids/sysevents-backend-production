"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationCacheService = void 0;
exports.translateWithGoogle = translateWithGoogle;
exports.translateGroupWithGoogle = translateGroupWithGoogle;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("../../../config/env");
const logger_1 = require("../../../shared/logger/logger");
const TRANSLATION_CACHE_DIR = path_1.default.resolve(env_1.env.FILE_STORAGE_PATH, 'i18n-cache');
const GOOGLE_TRANSLATION_ENDPOINTS = [
    'https://translate.googleapis.com/translate_a/single',
    'https://translate.google.com/translate_a/single',
];
function normalizeText(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function isProtectedValue(value) {
    const text = normalizeText(value);
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text))
        return true;
    if (/https?:\/\/|www\./i.test(text))
        return true;
    if (/\b[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\b/i.test(text))
        return true;
    if (/\b(?:folio|orden|order)\s+[A-Z0-9-]{4,}\b/i.test(text))
        return true;
    if (/^[A-Z0-9-]{6,}$/.test(text))
        return true;
    if (/^\+?\d[\d\s().-]{6,}$/.test(text))
        return true;
    return false;
}
function isTranslatableText(value) {
    const normalized = normalizeText(value);
    if (normalized.length < 2)
        return false;
    if (isProtectedValue(normalized))
        return false;
    if (/^[\d\s.,:;+\-/$%()]+$/.test(normalized))
        return false;
    return /\p{L}/u.test(normalized);
}
async function readJson(filePath) {
    try {
        return JSON.parse(await fs_1.promises.readFile(filePath, 'utf8'));
    }
    catch {
        // The cache is an optimization. A missing, truncated or temporarily
        // unavailable file must never disable translation for the public site.
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
async function translateWithGoogle(text, targetLanguage) {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: 'es',
        tl: targetLanguage,
        dt: 't',
        q: text,
    });
    let lastError;
    for (const endpoint of GOOGLE_TRANSLATION_ENDPOINTS) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: params,
                signal: AbortSignal.timeout(5_000),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (compatible; SysEvents/1.0; +https://eventos.ulv.edu.mx)',
                },
            });
            if (!response.ok) {
                throw new Error(`Translation provider returned ${response.status}`);
            }
            const payload = await response.json();
            const translated = payload[0]?.map((segment) => segment[0]).join('').trim();
            if (!translated)
                throw new Error('Translation provider returned an empty response');
            return translated;
        }
        catch (error) {
            lastError = error;
        }
    }
    throw lastError instanceof Error ? lastError : new Error('Translation provider unavailable');
}
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function decodeHtml(value) {
    const named = {
        amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'",
    };
    return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
        if (code.startsWith('#x'))
            return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
        if (code.startsWith('#'))
            return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
        return named[code.toLowerCase()] ?? entity;
    });
}
async function translateGroupWithGoogle(texts, targetLanguage) {
    const markup = texts
        .map((text, index) => `<span data-sysevents-id="${index}">${escapeHtml(text)}</span>`)
        .join('');
    const translatedMarkup = await translateWithGoogle(markup, targetLanguage);
    const translations = new Map();
    const pattern = /<span\s+data-sysevents-id=["'](\d+)["']>([\s\S]*?)<\/span>/gi;
    let match = pattern.exec(translatedMarkup);
    while (match) {
        const index = Number(match[1]);
        if (texts[index] !== undefined)
            translations.set(texts[index], decodeHtml(match[2]).trim());
        match = pattern.exec(translatedMarkup);
    }
    if (translations.size !== texts.length)
        throw new Error('Translation provider changed batch markers');
    return translations;
}
function groupByCharacterLimit(texts, characterLimit = 4_000) {
    const groups = [];
    let current = [];
    let currentLength = 0;
    texts.forEach((text) => {
        const estimatedLength = text.length + 48;
        if (current.length && currentLength + estimatedLength > characterLimit) {
            groups.push(current);
            current = [];
            currentLength = 0;
        }
        current.push(text);
        currentLength += estimatedLength;
    });
    if (current.length)
        groups.push(current);
    return groups;
}
async function translateGroupResilient(texts, targetLanguage) {
    try {
        return await translateGroupWithGoogle(texts, targetLanguage);
    }
    catch (error) {
        logger_1.logger.warn('Translation group could not be resolved', {
            targetLanguage,
            textCount: texts.length,
            characterCount: texts.reduce((total, text) => total + text.length, 0),
            error: error instanceof Error ? error.message : String(error),
        });
        return new Map();
    }
}
async function translateConcurrently(texts, targetLanguage, concurrency = 4) {
    const translations = new Map();
    const groups = groupByCharacterLimit(texts);
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, groups.length) }, async () => {
        while (nextIndex < groups.length) {
            const group = groups[nextIndex++];
            const resolved = await translateGroupResilient(group, targetLanguage);
            resolved.forEach((translated, text) => translations.set(text, translated));
        }
    });
    await Promise.all(workers);
    return translations;
}
class TranslationCacheService {
    languageQueues = new Map();
    async translateMany(texts, targetLanguage) {
        const previous = this.languageQueues.get(targetLanguage) ?? Promise.resolve();
        let releaseQueue;
        const current = new Promise((resolve) => {
            releaseQueue = resolve;
        });
        const queued = previous.then(() => current);
        this.languageQueues.set(targetLanguage, queued);
        await previous;
        try {
            return await this.translateManyExclusive(texts, targetLanguage);
        }
        finally {
            releaseQueue();
            if (this.languageQueues.get(targetLanguage) === queued) {
                this.languageQueues.delete(targetLanguage);
            }
        }
    }
    async translateManyExclusive(texts, targetLanguage) {
        const filePath = path_1.default.join(TRANSLATION_CACHE_DIR, `${targetLanguage}.json`);
        const cache = await readJson(filePath);
        const uniqueTexts = [...new Set(texts.map(normalizeText).filter(isTranslatableText))];
        let changed = false;
        const missingTexts = uniqueTexts.filter((text) => !cache[text] || normalizeText(cache[text]) === text);
        if (missingTexts.length) {
            const translations = await translateConcurrently(missingTexts, targetLanguage);
            translations.forEach((translated, text) => {
                // Do not poison the target-language cache with the Spanish source when
                // the upstream provider gives no effective translation.
                if (normalizeText(translated) !== text) {
                    if (cache[text] !== translated)
                        changed = true;
                    cache[text] = translated;
                }
                else if (cache[text]) {
                    delete cache[text];
                    changed = true;
                }
            });
        }
        if (changed) {
            // A read-only or temporarily unavailable volume must not turn a valid
            // provider response into a 500. Translation still succeeds without cache.
            await writeJson(filePath, cache).catch(() => undefined);
        }
        return uniqueTexts.reduce((result, text) => {
            result[text] = cache[text] ?? text;
            return result;
        }, {});
    }
    async restoreMany(texts, sourceLanguage) {
        const filePath = path_1.default.join(TRANSLATION_CACHE_DIR, `${sourceLanguage}.json`);
        const cache = await readJson(filePath);
        const inverted = Object.entries(cache).reduce((result, [spanish, translated]) => {
            result[normalizeText(translated)] = spanish;
            return result;
        }, {});
        const uniqueTexts = [...new Set(texts.map(normalizeText).filter(isTranslatableText))];
        return uniqueTexts.reduce((result, text) => {
            if (inverted[text])
                result[text] = inverted[text];
            return result;
        }, {});
    }
}
exports.TranslationCacheService = TranslationCacheService;
//# sourceMappingURL=translation-cache.service.js.map