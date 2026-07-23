"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationCacheService = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("../../../config/env");
const TRANSLATION_CACHE_DIR = path_1.default.resolve(env_1.env.FILE_STORAGE_PATH, 'i18n-cache');
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
    if (/\b[A-Z0-9]{6,}\b/.test(text))
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
    catch (error) {
        if (error.code === 'ENOENT')
            return {};
        throw error;
    }
}
async function writeJson(filePath, data) {
    await fs_1.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
    await fs_1.promises.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
async function translateWithGoogle(text, targetLanguage) {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: 'es',
        tl: targetLanguage,
        dt: 't',
        q: text,
    });
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
    if (!response.ok)
        return text;
    const payload = await response.json();
    return payload[0]?.map((segment) => segment[0]).join('') || text;
}
async function translateConcurrently(texts, targetLanguage, concurrency = 6) {
    const translations = new Map();
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, texts.length) }, async () => {
        while (nextIndex < texts.length) {
            const text = texts[nextIndex++];
            translations.set(text, await translateWithGoogle(text, targetLanguage));
        }
    });
    await Promise.all(workers);
    return translations;
}
class TranslationCacheService {
    async translateMany(texts, targetLanguage) {
        const filePath = path_1.default.join(TRANSLATION_CACHE_DIR, `${targetLanguage}.json`);
        const cache = await readJson(filePath);
        const uniqueTexts = [...new Set(texts.map(normalizeText).filter(isTranslatableText))];
        let changed = false;
        const missingTexts = uniqueTexts.filter((text) => !cache[text]);
        if (missingTexts.length) {
            const translations = await translateConcurrently(missingTexts, targetLanguage);
            translations.forEach((translated, text) => {
                cache[text] = translated;
            });
            changed = true;
        }
        if (changed) {
            await writeJson(filePath, cache);
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