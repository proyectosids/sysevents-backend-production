"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateImporterService = void 0;
exports.rewriteHtmlAssetReferences = rewriteHtmlAssetReferences;
exports.removeTemplatePreloaders = removeTemplatePreloaders;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const env_1 = require("../../../../config/env");
const app_error_1 = require("../../../../shared/errors/app-error");
const template_preview_service_1 = require("./template-preview.service");
const maxTemplateFileBytes = 25 * 1024 * 1024;
const maxTemplateUncompressedBytes = 750 * 1024 * 1024;
const allowedExtensions = new Set([
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.js',
    '.mjs',
    '.cjs',
    '.ts',
    '.map',
    '.json',
    '.yml',
    '.yaml',
    '.xml',
    '.txt',
    '.md',
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.webp',
    '.avif',
    '.bmp',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
    '.mp4',
    '.webm',
    '',
]);
const ignoredTemplateFiles = new Set([
    '.ds_store',
    '.gitignore',
    '.npmrc',
    '.prettierrc',
    '.stylelintrc',
    'thumbs.db',
    'desktop.ini',
]);
const ignoredTemplateExtensions = new Set([
    '.codekit',
    '.codekit2',
    '.codekit3',
    '.lock',
    '.log',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.workflow',
    '.php',
    '.phtml',
    '.phar',
    '.psd',
    '.sketch',
    '.ai',
]);
function isIgnoredTemplateEntry(entryName) {
    const normalized = entryName.replace(/\\/g, '/').toLowerCase();
    const basename = path_1.default.basename(normalized);
    const extension = path_1.default.extname(normalized);
    return normalized.startsWith('__macosx/')
        || normalized.includes('/__macosx/')
        || normalized.startsWith('.git/')
        || normalized.includes('/.git/')
        || normalized.startsWith('.github/')
        || normalized.includes('/.github/')
        || normalized.startsWith('.vscode/')
        || normalized.includes('/.vscode/')
        || normalized.startsWith('.idea/')
        || normalized.includes('/.idea/')
        || normalized.startsWith('node_modules/')
        || normalized.includes('/node_modules/')
        || normalized.startsWith('source/')
        || normalized.includes('/source/')
        || normalized.startsWith('sources/')
        || normalized.includes('/sources/')
        || normalized.startsWith('src/')
        || normalized.includes('/src/')
        || ignoredTemplateFiles.has(basename)
        || ignoredTemplateExtensions.has(extension);
}
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70) || 'template';
}
function stripTags(value) {
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
}
function matchText(html, pattern, fallback = '') {
    const match = pattern.exec(html);
    return match ? stripTags(match[1]) : fallback;
}
function matchMany(html, pattern, limit = 6) {
    const values = [];
    for (const match of html.matchAll(pattern)) {
        const value = stripTags(match[1]);
        if (value && !values.includes(value))
            values.push(value);
        if (values.length >= limit)
            break;
    }
    return values;
}
function normalizeColor(value) {
    const color = value.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color;
}
function extractThemeColors(source) {
    const counts = new Map();
    const patterns = [
        /#[0-9a-f]{3,8}\b/gi,
        /rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)/gi,
    ];
    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const color = normalizeColor(match[0]);
            if (['#ffffff', '#fff', '#000000', '#000', 'transparent'].includes(color))
                continue;
            counts.set(color, (counts.get(color) ?? 0) + 1);
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => colorScore(b[0], b[1]) - colorScore(a[0], a[1]))
        .map(([color]) => color)
        .slice(0, 12);
}
function colorScore(color, count) {
    const rgb = colorToRgb(color);
    if (!rgb)
        return count;
    const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
    const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = (rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114) / 255;
    let score = count * (1 + saturation * 2) * (0.45 + brightness);
    if (brightness < 0.18)
        score *= 0.35;
    if (saturation < 0.15)
        score *= 0.35;
    return score;
}
function colorToRgb(color) {
    const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(color);
    if (hex) {
        return {
            r: Number.parseInt(hex[1].slice(0, 2), 16),
            g: Number.parseInt(hex[1].slice(2, 4), 16),
            b: Number.parseInt(hex[1].slice(4, 6), 16),
        };
    }
    const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(color);
    if (!rgb)
        return null;
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
}
function isVendorStyleEntry(entryName) {
    const normalized = entryName.replace(/\\/g, '/').toLowerCase();
    return [
        'bootstrap',
        'font-awesome',
        'fontawesome',
        'jquery',
        'owl.',
        'owl-',
        'slick',
        'magnific',
        'animate',
        'nice-select',
        'flaticon',
        'elegant-icons',
        'themify',
        'normalize',
    ].some((token) => normalized.includes(token));
}
function extractFontFamilies(source) {
    const fonts = [];
    for (const match of source.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
        const family = match[1]
            .split(',')
            .map((item) => item.trim().replace(/^["']|["']$/g, ''))
            .find((item) => item && !/^(inherit|initial|unset|sans-serif|serif|monospace)$/i.test(item));
        if (family && !fonts.includes(family)) {
            fonts.push(family);
        }
        if (fonts.length >= 4)
            break;
    }
    return fonts;
}
function cssRuleValue(source, selectors, property) {
    const propertyPattern = new RegExp(`${property}\\s*:\\s*([^;{}]+)`, 'i');
    for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const ruleSelectors = match[1].split(',').map((selector) => selector.trim().toLowerCase());
        if (!ruleSelectors.some((selector) => selectors.some((candidate) => selector === candidate || selector.endsWith(` ${candidate}`)))) {
            continue;
        }
        const value = propertyPattern.exec(match[2])?.[1]?.trim();
        if (value)
            return value;
    }
    return '';
}
function cleanFontFamily(value) {
    return value
        .split(',')
        .map((item) => item.trim().replace(/^["']|["']$/g, ''))
        .find((item) => item && !/^(inherit|initial|unset|sans-serif|serif|monospace)$/i.test(item)) ?? '';
}
function extractThemeTypography(source) {
    const fallbackFonts = extractFontFamilies(source);
    const bodyFontFamily = cleanFontFamily(cssRuleValue(source, ['body', 'html body'], 'font-family'))
        || fallbackFonts[0]
        || '';
    const headingFontFamily = cleanFontFamily(cssRuleValue(source, ['h1', 'h2', 'h3', '.section-title'], 'font-family'))
        || bodyFontFamily;
    return {
        headingFontFamily,
        bodyFontFamily,
        bodyFontSize: cssRuleValue(source, ['body', 'html body'], 'font-size'),
        sectionTitleFontSize: cssRuleValue(source, ['h2', '.section-title'], 'font-size'),
        itemTitleFontSize: cssRuleValue(source, ['h3', '.schedule-title', '.event-title'], 'font-size'),
    };
}
function extractBorderRadius(source) {
    const match = /border-radius\s*:\s*([0-9.]+)(px|rem|em)/i.exec(source);
    if (!match)
        return 8;
    const value = Number(match[1]);
    if (!Number.isFinite(value))
        return 8;
    if (match[2] === 'px')
        return Math.min(Math.max(Math.round(value), 0), 32);
    return Math.min(Math.max(Math.round(value * 16), 0), 32);
}
function extractSection(html, id) {
    const pattern = new RegExp(`<section[^>]+id=["']${id}["'][\\s\\S]*?<\\/section>`, 'i');
    return pattern.exec(html)?.[0] ?? '';
}
function normalizeEntryPath(value) {
    return value.replace(/\\/g, '/').replace(/^\/+/, '');
}
function pageSlugFromEntry(entryName) {
    const base = path_1.default.basename(entryName, path_1.default.extname(entryName));
    return base.toLowerCase() === 'index' ? 'home' : slugify(base);
}
function pageTitleFromHtml(html, entryName) {
    return matchText(html, /<title[^>]*>([\s\S]*?)<\/title>/i, path_1.default.basename(entryName, path_1.default.extname(entryName)))
        || path_1.default.basename(entryName, path_1.default.extname(entryName));
}
function getEntryDirectory(entryName) {
    const directory = path_1.default.dirname(normalizeEntryPath(entryName)).replace(/\\/g, '/');
    return directory === '.' ? '' : directory;
}
function resolveAssetPath(sourceFile, assetPath) {
    const cleanAssetPath = assetPath.trim();
    if (!cleanAssetPath || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(cleanAssetPath)) {
        return cleanAssetPath;
    }
    const directory = getEntryDirectory(sourceFile);
    return normalizeEntryPath(path_1.default.posix.normalize(path_1.default.posix.join(directory, cleanAssetPath)));
}
function publicAssetUrl(templateKey, sourceFile, assetPath) {
    const resolved = resolveAssetPath(sourceFile, assetPath);
    if (!resolved || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(resolved)) {
        return resolved;
    }
    return `/api/public/site-template-assets/${encodeURIComponent(templateKey)}/${resolved
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')}`;
}
function publicResolvedAssetUrl(templateKey, assetPath) {
    if (!assetPath || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(assetPath)) {
        return assetPath;
    }
    return `/api/public/site-template-assets/${encodeURIComponent(templateKey)}/${assetPath
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')}`;
}
function isTemplateDocumentReference(value) {
    return /\.html?(?:[?#].*)?$/i.test(value.trim());
}
function rewriteHtmlAssetReferences(html, templateKey, sourceFile) {
    return html
        .replace(/\s(src|href)=["']([^"']+)["']/gi, (full, attribute, value) => {
        // Page navigation belongs to the SysEvents public router. Keeping the
        // authored document reference lets the public renderer map it to the
        // corresponding /events/:slug/:pageSlug route. Assets and downloads
        // continue to use the protected template asset endpoint.
        if (attribute.toLowerCase() === 'href' && isTemplateDocumentReference(value))
            return full;
        return ` ${attribute}="${publicAssetUrl(templateKey, sourceFile, value)}"`;
    })
        .replace(/\s(srcset)=["']([^"']+)["']/gi, (full, attribute, value) => {
        const nextValue = value
            .split(',')
            .map((candidate) => {
            const [url, descriptor] = candidate.trim().split(/\s+/, 2);
            return [publicAssetUrl(templateKey, sourceFile, url), descriptor].filter(Boolean).join(' ');
        })
            .join(', ');
        return ` ${attribute}="${nextValue}"`;
    })
        .replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (_full, _quote, value) => {
        return `url('${publicAssetUrl(templateKey, sourceFile, value).replace(/'/g, '%27')}')`;
    });
}
function extractLinkedFiles(html, sourceFile, extension) {
    const files = [];
    const pattern = extension === '.css'
        ? /<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi
        : /<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi;
    for (const match of html.matchAll(pattern)) {
        const resolved = resolveAssetPath(sourceFile, match[1].split('?')[0]);
        if (resolved && !/^(https?:|data:)/i.test(resolved) && !files.includes(resolved)) {
            files.push(resolved);
        }
    }
    return files;
}
function extractFirstImageUrl(html, sourceFile, templateKey) {
    const imagePath = /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]
        ?? /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/i.exec(html)?.[1]
        ?? '';
    return imagePath ? publicAssetUrl(templateKey, sourceFile, imagePath) : null;
}
function extractBody(html) {
    return /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
}
function getAttribute(openingTag, name) {
    return new RegExp(`${name}=["']([^"']+)["']`, 'i').exec(openingTag)?.[1] ?? '';
}
const exactTemplateLoaderTokens = new Set([
    'app-loader',
    'app-loading',
    'global-loader',
    'global-loading',
    'initial-loader',
    'initial-loading',
    'load-screen',
    'loader-overlay',
    'loader-wrapper',
    'loading-overlay',
    'loading-page',
    'loading-screen',
    'loading-wrapper',
    'page-loader',
    'page-loading',
    'page-preloader',
    'page-preloder',
    'pre-loader',
    'pre-loder',
    'pre-loading',
    'preloader',
    'preloader-active',
    'preloader-wrapper',
    'preloder',
    'site-loader',
    'site-loading',
    'site-preloader',
    'startup-loader',
    'startup-loading',
]);
function normalizeLoaderToken(value) {
    return value.trim().toLowerCase().replace(/_/g, '-');
}
function isTemplateLoaderToken(value, allowGeneric) {
    const normalized = normalizeLoaderToken(value);
    const compact = normalized.replace(/[^a-z0-9]/g, '');
    if (!normalized)
        return false;
    if (exactTemplateLoaderTokens.has(normalized))
        return true;
    if (/^pre(?:loader|loder|loading)/.test(compact))
        return true;
    if (allowGeneric && /^(?:loader|loading)$/.test(compact))
        return true;
    return /(?:loader|loading)/.test(normalized)
        && /(?:page|site|app|global|initial|startup|screen|overlay|wrapper|fullscreen)/.test(normalized);
}
function isTemplateLoaderTag(openingTag) {
    const id = getAttribute(openingTag, 'id');
    const classNames = getAttribute(openingTag, 'class').split(/\s+/).filter(Boolean);
    const role = normalizeLoaderToken(getAttribute(openingTag, 'role'));
    const ariaLabel = normalizeLoaderToken(getAttribute(openingTag, 'aria-label'));
    const ariaBusy = normalizeLoaderToken(getAttribute(openingTag, 'aria-busy'));
    const attributes = Array.from(openingTag.matchAll(/\s([:\w-]+)(?:=["']([^"']*)["'])?/g));
    if (isTemplateLoaderToken(id, true))
        return true;
    if (classNames.some((className) => isTemplateLoaderToken(className, false)))
        return true;
    const hasLoadingDataAttribute = attributes.some((match) => {
        const name = normalizeLoaderToken(match[1]);
        const value = normalizeLoaderToken(match[2] ?? '');
        return (/^data-(?:pre-?)?(?:loader|loder|loading)(?:-|$)/.test(name)
            || (name === 'data-state' && /^(?:loading|preloading)$/.test(value))
            || (name === 'data-loader' && /^(?:page|site|app|global|initial|startup)$/.test(value)));
    });
    if (hasLoadingDataAttribute)
        return true;
    const hasLoadingSemantics = ariaBusy === 'true'
        || role === 'progressbar'
        || (role === 'status' && /(?:load|carg)/.test(ariaLabel));
    const hasOverlayIdentity = [id, ...classNames].some((token) => {
        const normalized = normalizeLoaderToken(token);
        return /(?:loader|loading)/.test(normalized)
            || /(?:page|site|app|global|initial|startup|screen|overlay|wrapper|fullscreen)/.test(normalized);
    });
    return hasLoadingSemantics && hasOverlayIdentity;
}
function removeScripts(html) {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '');
}
function removeTemplatePreloaders(html) {
    let sanitized = html;
    for (let pass = 0; pass < 25; pass += 1) {
        const openingPattern = /<([a-z][\w:-]*)\b[^>]*>/gi;
        let opening = null;
        while ((opening = openingPattern.exec(sanitized))) {
            if (isTemplateLoaderTag(opening[0])) {
                break;
            }
        }
        if (!opening) {
            break;
        }
        const tag = opening[1].toLowerCase();
        const sameTagPattern = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
        sameTagPattern.lastIndex = opening.index + opening[0].length;
        let depth = 1;
        let closingEnd = opening.index + opening[0].length;
        let tagMatch;
        while ((tagMatch = sameTagPattern.exec(sanitized))) {
            const isClosing = tagMatch[0].startsWith('</');
            const isSelfClosing = /\/\s*>$/.test(tagMatch[0]);
            depth += isClosing ? -1 : isSelfClosing ? 0 : 1;
            closingEnd = tagMatch.index + tagMatch[0].length;
            if (depth === 0)
                break;
        }
        sanitized = sanitized.slice(0, opening.index) + sanitized.slice(closingEnd);
    }
    return sanitized;
}
function extractPreservedSections(html, sourceFile, templateKey) {
    const body = removeTemplatePreloaders(removeScripts(extractBody(html)));
    const pageTitle = pageTitleFromHtml(html, sourceFile);
    const cssFiles = extractLinkedFiles(html, sourceFile, '.css').map((file) => publicResolvedAssetUrl(templateKey, file));
    const jsFiles = extractLinkedFiles(html, sourceFile, '.js').map((file) => publicResolvedAssetUrl(templateKey, file));
    const fragments = splitPreservedTemplateHtml(body);
    return fragments.map((fragment, index) => ({
        sectionType: 'template_html_section',
        title: fragment.title || pageTitle || 'Pagina HTML importada',
        content: {
            preserveTemplateHtml: true,
            sourceFile,
            sourceIndex: index,
            sourceTag: fragment.tag,
            sourceId: fragment.id,
            sourceClasses: fragment.classes,
            html: rewriteHtmlAssetReferences(fragment.html, templateKey, sourceFile),
            cssFiles,
            jsFiles: index === 0 ? jsFiles : [],
            elements: [],
            objects: [],
        },
    }));
}
function splitPreservedTemplateHtml(html) {
    const fragments = [];
    const pattern = /<\/?(nav|header|section|footer|article)\b[^>]*>/gi;
    const stack = [];
    let rootStart = -1;
    let rootTag = '';
    let rootOpeningTag = '';
    let match;
    while ((match = pattern.exec(html))) {
        const fullTag = match[0];
        const tag = match[1].toLowerCase();
        const isClosingTag = fullTag.startsWith('</');
        if (!isClosingTag) {
            if (!stack.length) {
                rootStart = match.index;
                rootTag = tag;
                rootOpeningTag = fullTag;
            }
            stack.push(tag);
            continue;
        }
        const matchingIndex = stack.lastIndexOf(tag);
        if (matchingIndex === -1)
            continue;
        stack.splice(matchingIndex);
        if (!stack.length && rootStart >= 0) {
            const fragmentHtml = html.slice(rootStart, match.index + fullTag.length).trim();
            if (fragmentHtml && isUsefulTemplateFragment(fragmentHtml)) {
                fragments.push({
                    html: fragmentHtml,
                    tag: rootTag,
                    id: getAttribute(rootOpeningTag, 'id'),
                    classes: getAttribute(rootOpeningTag, 'class'),
                    title: titleFromPreservedTemplateFragment(fragmentHtml, rootTag, rootOpeningTag, fragments.length),
                });
            }
            rootStart = -1;
            rootTag = '';
            rootOpeningTag = '';
        }
    }
    if (fragments.length > 1)
        return fragments;
    return [{
            html: html.trim(),
            tag: 'body',
            id: '',
            classes: '',
            title: 'Pagina HTML importada',
        }];
}
function isUsefulTemplateFragment(html) {
    return Boolean(stripTags(html).trim()) || /<(img|video|iframe|canvas)\b/i.test(html);
}
function titleFromPreservedTemplateFragment(html, tag, openingTag, index) {
    if (tag === 'nav')
        return 'Navbar';
    if (tag === 'header')
        return 'Header';
    if (tag === 'footer')
        return 'Footer';
    const heading = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i.exec(html)?.[1];
    const headingText = heading ? stripTags(heading).replace(/\s+/g, ' ').trim() : '';
    if (headingText)
        return headingText.slice(0, 80);
    const className = getAttribute(openingTag, 'class')
        .split(/\s+/)
        .find((item) => /(section|hero|speaker|schedule|agenda|pricing|price|contact|about|venue|sponsor|gallery|footer|header|navbar|program)/i.test(item));
    if (className)
        return humanizePreservedTemplateName(className);
    const id = getAttribute(openingTag, 'id');
    if (id)
        return humanizePreservedTemplateName(id);
    return `Seccion HTML ${index + 1}`;
}
function humanizePreservedTemplateName(value) {
    const normalized = value
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
        .trim();
    return normalized || 'Seccion HTML';
}
class TemplateImporterService {
    rootPath = path_1.default.resolve(process.cwd(), env_1.env.FILE_STORAGE_PATH, 'site-templates');
    async importZip(file, input) {
        if (!file.originalname.toLowerCase().endsWith('.zip')) {
            throw new app_error_1.AppError('Template must be a ZIP file', 400, 'INVALID_TEMPLATE_FILE');
        }
        const zip = new adm_zip_1.default(file.buffer);
        const entries = zip.getEntries().filter((entry) => !entry.isDirectory && !isIgnoredTemplateEntry(entry.entryName));
        if (!entries.length) {
            throw new app_error_1.AppError('Template ZIP is empty', 400, 'EMPTY_TEMPLATE');
        }
        const indexEntry = entries.find((entry) => path_1.default.basename(entry.entryName).toLowerCase() === 'index.html');
        if (!indexEntry) {
            throw new app_error_1.AppError('Template ZIP must include index.html', 400, 'TEMPLATE_INDEX_REQUIRED');
        }
        let totalUncompressedBytes = 0;
        for (const entry of entries) {
            const normalized = entry.entryName.replace(/\\/g, '/');
            if (normalized.includes('..') || path_1.default.isAbsolute(normalized)) {
                throw new app_error_1.AppError('Template ZIP contains unsafe paths', 400, 'UNSAFE_TEMPLATE_PATH');
            }
            const entrySize = entry.header.size;
            if (entrySize > maxTemplateFileBytes) {
                throw new app_error_1.AppError(`Template file is too large: ${normalized}`, 400, 'TEMPLATE_FILE_TOO_LARGE');
            }
            totalUncompressedBytes += entrySize;
            if (totalUncompressedBytes > maxTemplateUncompressedBytes) {
                throw new app_error_1.AppError('Template ZIP uncompressed size is too large', 400, 'TEMPLATE_TOO_LARGE');
            }
            const extension = path_1.default.extname(normalized).toLowerCase();
            if (!allowedExtensions.has(extension)) {
                throw new app_error_1.AppError(`Template contains unsupported file type "${extension || '(sin extension)'}" in ${normalized}`, 400, 'UNSUPPORTED_TEMPLATE_FILE');
            }
        }
        const indexHtml = indexEntry.getData().toString('utf8');
        const title = input.name?.trim() || matchText(indexHtml, /<title[^>]*>([\s\S]*?)<\/title>/i, file.originalname.replace(/\.zip$/i, ''));
        const key = `imported-${slugify(title)}-${crypto_1.default.randomUUID().slice(0, 8)}`;
        const targetDirectory = path_1.default.join(this.rootPath, key);
        await promises_1.default.mkdir(targetDirectory, { recursive: true });
        for (const entry of entries) {
            const normalized = entry.entryName.replace(/\\/g, '/');
            const targetPath = path_1.default.join(targetDirectory, normalized);
            if (!targetPath.startsWith(targetDirectory)) {
                throw new app_error_1.AppError('Template ZIP contains unsafe paths', 400, 'UNSAFE_TEMPLATE_PATH');
            }
            await promises_1.default.mkdir(path_1.default.dirname(targetPath), { recursive: true });
            await promises_1.default.writeFile(targetPath, entry.getData());
        }
        const htmlEntries = entries
            .filter((entry) => path_1.default.extname(entry.entryName).toLowerCase() === '.html')
            .sort((a, b) => {
            const aName = path_1.default.basename(a.entryName).toLowerCase();
            const bName = path_1.default.basename(b.entryName).toLowerCase();
            if (aName === 'index.html')
                return -1;
            if (bName === 'index.html')
                return 1;
            return a.entryName.localeCompare(b.entryName);
        });
        const pages = htmlEntries.map((entry, pageIndex) => {
            const sourceFile = normalizeEntryPath(entry.entryName);
            const html = entry.getData().toString('utf8');
            return {
                title: pageTitleFromHtml(html, entry.entryName),
                slug: pageSlugFromEntry(entry.entryName),
                sourceFile,
                sortOrder: pageIndex,
                sections: extractPreservedSections(html, sourceFile, key),
            };
        });
        const firstPageSections = pages[0]?.sections ?? [];
        const heroSection = extractSection(indexHtml, 'section_1');
        const aboutSection = extractSection(indexHtml, 'section_2');
        const speakersSection = extractSection(indexHtml, 'section_3');
        const scheduleSection = extractSection(indexHtml, 'section_4');
        const pricingSection = extractSection(indexHtml, 'section_5');
        const venueSection = extractSection(indexHtml, 'section_6');
        const contactSection = extractSection(indexHtml, 'section_7');
        const heroTitle = matchText(heroSection, /<h1[^>]*>([\s\S]*?)<\/h1>/i, title);
        const subtitle = matchText(heroSection, /<p[^>]*>([\s\S]*?)<\/p>/i, 'Personaliza esta plantilla para tu evento academico.');
        const speakerNames = matchMany(speakersSection, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, 6);
        const agendaItems = matchMany(scheduleSection, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, 6);
        const pricingItems = matchMany(pricingSection, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, 4);
        const navItems = matchMany(indexHtml, /<a[^>]+class=["'][^"']*nav-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, 12);
        const cssEntries = entries.filter((entry) => path_1.default.extname(entry.entryName).toLowerCase() === '.css');
        const customCssEntries = cssEntries.filter((entry) => !isVendorStyleEntry(entry.entryName));
        const cssSource = (customCssEntries.length ? customCssEntries : cssEntries)
            .slice(0, 20)
            .map((entry) => entry.getData().toString('utf8'))
            .join('\n');
        const visualSource = `${indexHtml}\n${cssSource}`;
        const palette = extractThemeColors(visualSource);
        const typography = extractThemeTypography(visualSource);
        const primaryColor = palette[0] ?? '#0dcaf0';
        const surfaceColor = palette.find((color) => color !== primaryColor && /#f|rgb/i.test(color)) ?? '#ffffff';
        const textColor = palette.find((color) => color !== primaryColor && /#0|#1|#2|rgb\(0|rgb\(1|rgb\(2/i.test(color)) ?? '#0f172a';
        const screenshotPath = await (0, template_preview_service_1.ensureTemplateScreenshot)({
            rootPath: targetDirectory,
            sourceFile: normalizeEntryPath(indexEntry.entryName),
        }).catch(() => null);
        return {
            key,
            name: title,
            description: input.description ?? 'Plantilla HTML importada por el administrador SaaS.',
            previewImageUrl: screenshotPath
                ? publicResolvedAssetUrl(key, screenshotPath)
                : extractFirstImageUrl(indexHtml, normalizeEntryPath(indexEntry.entryName), key),
            primaryColor,
            globalStyles: {
                background: 'imported',
                source: 'html-zip',
                originalFileName: file.originalname,
                storagePath: path_1.default.relative(path_1.default.resolve(process.cwd(), env_1.env.FILE_STORAGE_PATH), targetDirectory),
                palette,
                typography,
                components: {
                    borderRadius: extractBorderRadius(visualSource),
                    buttonRadius: extractBorderRadius(visualSource),
                },
                tokens: {
                    primaryColor,
                    accentColor: palette[1] ?? primaryColor,
                    textColor,
                    mutedTextColor: palette[2] ?? '#64748b',
                    surfaceColor,
                    buttonColor: primaryColor,
                    buttonTextColor: '#ffffff',
                },
                navItems,
            },
            template: {
                source: {
                    type: 'html-zip',
                    key,
                    originalFileName: file.originalname,
                    filesCount: entries.length,
                    indexPath: indexEntry.entryName,
                },
                pages,
                structuralSections: firstPageSections,
                sections: {
                    ...firstPageSections.reduce((acc, section, index) => {
                        acc[`template_html_section_${index + 1}`] = {
                            title: section.title,
                            content: section.content,
                        };
                        return acc;
                    }, {}),
                    about: {
                        title: matchText(aboutSection, /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i, 'Acerca del evento'),
                        content: {
                            body: stripTags(aboutSection).slice(0, 700) || 'Describe aqui el objetivo, alcance y valor academico del evento.',
                            bullets: [
                                { text: 'Contenido importado desde plantilla HTML.' },
                                { text: 'Editable desde Site Studio sin tocar codigo.' },
                                { text: 'Puedes quitar, agregar y reordenar secciones.' },
                            ],
                        },
                    },
                    speakers: {
                        title: 'Ponentes',
                        content: {
                            speakers: (speakerNames.length ? speakerNames : ['Ponente invitado']).map((name) => ({
                                name,
                                affiliation: 'Institucion academica',
                                bio: 'Perfil editable del ponente.',
                            })),
                        },
                    },
                    agenda: {
                        title: 'Agenda',
                        content: {
                            items: (agendaItems.length ? agendaItems : ['Apertura', 'Conferencia magistral']).map((item, index) => ({
                                time: `${9 + index}:00`,
                                title: item,
                                description: 'Actividad editable del programa.',
                            })),
                        },
                    },
                    pricing: {
                        title: 'Costos',
                        content: {
                            items: (pricingItems.length ? pricingItems : ['Registro general']).map((item) => ({
                                name: item,
                                price: '$0',
                                description: 'Configura precio, cupo y beneficios.',
                            })),
                        },
                    },
                    map: {
                        title: 'Sede',
                        content: {
                            title: 'Como llegar',
                            address: stripTags(venueSection).slice(0, 220),
                            directions: [],
                        },
                    },
                    contact: {
                        title: 'Contacto',
                        content: {
                            email: matchText(contactSection, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i, 'eventos@institucion.edu'),
                            phone: '',
                            address: stripTags(venueSection).slice(0, 180),
                        },
                    },
                },
            },
        };
    }
}
exports.TemplateImporterService = TemplateImporterService;
//# sourceMappingURL=template-importer.service.js.map