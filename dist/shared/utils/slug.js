"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.createUniqueSlug = createUniqueSlug;
function slugify(value, fallback = 'item') {
    const slug = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
    return slug || fallback;
}
async function createUniqueSlug(value, exists, options = {}) {
    const maxLength = options.maxLength ?? 120;
    const base = slugify(value, options.fallback).slice(0, maxLength).replace(/-+$/g, '') || options.fallback || 'item';
    let candidate = base;
    let counter = 2;
    while (await exists(candidate)) {
        const suffix = `-${counter}`;
        candidate = `${base.slice(0, maxLength - suffix.length).replace(/-+$/g, '')}${suffix}`;
        counter += 1;
    }
    return candidate;
}
//# sourceMappingURL=slug.js.map