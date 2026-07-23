"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicSiteStudioRouter = exports.siteStudioRouter = void 0;
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../../../config/env");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const cms_repository_1 = require("../../cms/infrastructure/repositories/cms.repository");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const authenticate_middleware_1 = require("../../iam/presentation/middlewares/authenticate.middleware");
const require_permission_middleware_1 = require("../../iam/presentation/middlewares/require-permission.middleware");
const template_importer_service_1 = require("../application/services/template-importer.service");
const template_preview_service_1 = require("../application/services/template-preview.service");
const site_studio_repository_1 = require("../infrastructure/repositories/site-studio.repository");
const site_studio_schemas_1 = require("./schemas/site-studio.schemas");
exports.siteStudioRouter = (0, express_1.Router)();
exports.publicSiteStudioRouter = (0, express_1.Router)();
const siteRepository = new site_studio_repository_1.SiteStudioRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const cmsRepository = new cms_repository_1.CmsRepository();
const templateImporter = new template_importer_service_1.TemplateImporterService();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024 } });
function getTemplateSections(template) {
    if (!template || typeof template !== 'object') {
        return {};
    }
    const sections = template.sections;
    if (!sections || typeof sections !== 'object') {
        return {};
    }
    return sections;
}
function getTemplatePages(template) {
    if (!template || typeof template !== 'object') {
        return [];
    }
    const pages = template.pages;
    return Array.isArray(pages) ? pages.filter((page) => Boolean(page) && typeof page === 'object') : [];
}
function toObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function isTemplateSection(content) {
    return typeof content.sourceThemeId === 'string' || typeof content.sourceThemeKey === 'string';
}
function matchesActiveTheme(content, activeThemeId, activeThemeKey) {
    if (!isTemplateSection(content)) {
        return false;
    }
    return (typeof content.sourceThemeId === 'string' && content.sourceThemeId === activeThemeId)
        || (typeof content.sourceThemeKey === 'string' && content.sourceThemeKey === activeThemeKey);
}
function encodeTemplateAssetPath(templateKey, assetPath) {
    return `/api/public/site-template-assets/${encodeURIComponent(templateKey)}/${assetPath
        .replace(/\\/g, '/')
        .replace(/^\/+/, '')
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')}`;
}
function resolveTemplateAssetPath(sourceFile, assetPath) {
    const cleanAssetPath = assetPath.trim();
    if (!cleanAssetPath || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(cleanAssetPath)) {
        return cleanAssetPath;
    }
    const directory = path_1.default.posix.dirname(sourceFile.replace(/\\/g, '/'));
    const nextPath = cleanAssetPath.startsWith('/')
        ? cleanAssetPath.replace(/^\/+/, '')
        : path_1.default.posix.normalize(path_1.default.posix.join(directory === '.' ? '' : directory, cleanAssetPath));
    return nextPath.replace(/^\/+/, '');
}
function rewriteTemplateDemoHtml(html, templateKey, sourceFile) {
    return html
        .replace(/\s(src|href)=["']([^"']+)["']/gi, (_full, attribute, value) => {
        const resolved = resolveTemplateAssetPath(sourceFile, value);
        const nextValue = /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(resolved)
            ? resolved
            : encodeTemplateAssetPath(templateKey, resolved);
        return ` ${attribute}="${nextValue}"`;
    })
        .replace(/\s(srcset)=["']([^"']+)["']/gi, (_full, attribute, value) => {
        const nextValue = value
            .split(',')
            .map((candidate) => {
            const [url, descriptor] = candidate.trim().split(/\s+/, 2);
            const resolved = resolveTemplateAssetPath(sourceFile, url);
            const nextUrl = /^(https?:|data:)/i.test(resolved) ? resolved : encodeTemplateAssetPath(templateKey, resolved);
            return [nextUrl, descriptor].filter(Boolean).join(' ');
        })
            .join(', ');
        return ` ${attribute}="${nextValue}"`;
    })
        .replace(/url\(["']?([^"')]+)["']?\)/gi, (_full, value) => {
        const resolved = resolveTemplateAssetPath(sourceFile, value);
        const nextValue = /^(https?:|data:|#)/i.test(resolved) ? resolved : encodeTemplateAssetPath(templateKey, resolved);
        return `url("${nextValue}")`;
    });
}
async function ensureEvent(eventId) {
    const event = await eventsRepository.findEventById(eventId);
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    return event;
}
exports.siteStudioRouter.use((req, res, next) => {
    if (req.path.startsWith('/site-studio') || /^\/events\/[^/]+\/site(?:\/|$)/.test(req.path)) {
        return (0, authenticate_middleware_1.authenticateMiddleware)(req, res, next);
    }
    return next();
});
exports.siteStudioRouter.get('/site-studio/themes', (0, require_permission_middleware_1.requirePermission)('site_studio.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const themes = await siteRepository.listThemes();
    return (0, api_response_1.sendSuccess)(res, 'Site themes retrieved successfully', themes);
}));
exports.siteStudioRouter.get('/site-studio/platform/templates', (0, require_permission_middleware_1.requirePermission)('site_templates.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const themes = await siteRepository.listAllThemes();
    return (0, api_response_1.sendSuccess)(res, 'Site templates retrieved successfully', themes);
}));
exports.siteStudioRouter.post('/site-studio/platform/templates/import', (0, require_permission_middleware_1.requirePermission)('site_templates.manage'), upload.single('template'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    if (!req.file) {
        throw new app_error_1.AppError('Template ZIP is required', 400, 'TEMPLATE_FILE_REQUIRED');
    }
    const imported = await templateImporter.importZip(req.file, {
        name: typeof req.body.name === 'string' ? req.body.name : undefined,
        description: typeof req.body.description === 'string' ? req.body.description : undefined,
    });
    const theme = await siteRepository.createTheme({
        ...imported,
        isActive: true,
        sortOrder: 90,
    });
    return (0, api_response_1.sendSuccess)(res, 'Template imported successfully', theme, 201);
}));
exports.siteStudioRouter.get('/site-studio/plugins', (0, require_permission_middleware_1.requirePermission)('site_studio.read'), (0, async_handler_1.asyncHandler)(async (_req, res) => {
    const plugins = await siteRepository.listPlugins();
    return (0, api_response_1.sendSuccess)(res, 'Site plugins retrieved successfully', plugins);
}));
exports.siteStudioRouter.get('/events/:eventId/site/settings', (0, require_permission_middleware_1.requirePermission)('site_studio.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_studio_schemas_1.siteEventParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const settings = await siteRepository.getSettings(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Site settings retrieved successfully', settings);
}));
exports.siteStudioRouter.patch('/events/:eventId/site/settings', (0, require_permission_middleware_1.requirePermission)('site_studio.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_studio_schemas_1.siteEventParamsSchema.parse(req.params);
    const input = site_studio_schemas_1.updateSiteSettingsSchema.parse(req.body);
    await ensureEvent(eventId);
    await siteRepository.snapshot(eventId, 'settings_updated', req.user.id);
    const settings = await siteRepository.updateSettings(eventId, input);
    return (0, api_response_1.sendSuccess)(res, 'Site settings updated successfully', settings);
}));
exports.siteStudioRouter.post('/events/:eventId/site/themes/:themeId/apply', (0, require_permission_middleware_1.requirePermission)('site_studio.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, themeId } = site_studio_schemas_1.themeParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const theme = await siteRepository.findTheme(themeId);
    if (!theme) {
        throw new app_error_1.AppError('Site theme not found', 404, 'SITE_THEME_NOT_FOUND');
    }
    await siteRepository.snapshot(eventId, 'theme_applied', req.user.id);
    const currentSettings = await siteRepository.getSettings(eventId);
    const templatePages = getTemplatePages(theme.template);
    const [pages, sections] = await Promise.all([
        cmsRepository.listPages(eventId),
        cmsRepository.listSections(eventId),
    ]);
    const homePage = pages.find((page) => page.slug === 'home') ?? pages[0];
    if (templatePages.length) {
        let knownPages = [...pages];
        const targetPageSlugs = new Set(templatePages.map((templatePage) => templatePage.slug || 'home'));
        const templateOwnedPageIds = new Set(sections
            .filter((section) => Boolean(toObject(section.content).sourceThemeKey))
            .map((section) => section.pageId)
            .filter((pageId) => Boolean(pageId)));
        for (const templatePage of templatePages) {
            const pageSlug = templatePage.slug || 'home';
            let page = knownPages.find((candidate) => candidate.slug === pageSlug);
            if (!page) {
                const pageInput = {
                    title: templatePage.title ?? pageSlug,
                    slug: pageSlug,
                    status: currentSettings.status === 'published' ? 'published' : 'draft',
                    sortOrder: templatePage.sortOrder ?? knownPages.length,
                };
                const restoredPage = await cmsRepository.restorePageForThemeChange(eventId, {
                    ...pageInput,
                    updatedBy: req.user.id,
                });
                if (restoredPage) {
                    page = restoredPage;
                }
                else {
                    page = await cmsRepository.createPage(eventId, {
                        ...pageInput,
                        createdBy: req.user.id,
                    });
                }
                knownPages = [...knownPages, page];
            }
            else {
                page = await cmsRepository.updatePage(eventId, page.id, {
                    title: templatePage.title ?? page.title,
                    sortOrder: templatePage.sortOrder ?? page.sortOrder,
                    updatedBy: req.user.id,
                }) ?? page;
            }
            const templatePageSections = templatePage.sections ?? [];
            const expectedTemplateSections = new Set();
            for (let index = 0; index < templatePageSections.length; index += 1) {
                const templateSection = templatePageSections[index];
                const templateContent = {
                    ...toObject(templateSection.content),
                    sourceThemeId: theme.id,
                    sourceThemeKey: theme.key,
                    sourceFile: templatePage.sourceFile ?? toObject(templateSection.content).sourceFile,
                    sourceIndex: Number(toObject(templateSection.content).sourceIndex ?? index),
                };
                expectedTemplateSections.add([
                    templateSection.sectionType ?? 'template_html_section',
                    templateContent.sourceFile,
                    templateContent.sourceIndex,
                ].join('|'));
                const existingSection = sections.find((section) => {
                    const content = toObject(section.content);
                    return section.pageId === page.id
                        && section.sectionType === (templateSection.sectionType ?? 'template_html_section')
                        && content.sourceThemeKey === templateContent.sourceThemeKey
                        && content.sourceFile === templateContent.sourceFile
                        && Number(content.sourceIndex ?? -1) === Number(templateContent.sourceIndex);
                });
                if (existingSection) {
                    await cmsRepository.updateSection(eventId, existingSection.id, {
                        title: templateSection.title ?? existingSection.title,
                        content: {
                            ...templateContent,
                            objects: Array.isArray(toObject(existingSection.content).objects)
                                ? toObject(existingSection.content).objects
                                : toObject(templateSection.content).objects,
                        },
                        status: existingSection.status,
                        sortOrder: index * 10,
                        updatedBy: req.user.id,
                    });
                    continue;
                }
                await cmsRepository.createSection(eventId, {
                    pageId: page.id,
                    sectionType: templateSection.sectionType ?? 'template_html_section',
                    title: templateSection.title ?? `Seccion ${index + 1}`,
                    content: templateContent,
                    status: currentSettings.status === 'published' ? 'published' : 'draft',
                    sortOrder: index * 10,
                    createdBy: req.user.id,
                });
            }
            await Promise.all(sections.filter((section) => {
                const content = toObject(section.content);
                if (section.pageId !== page.id || content.sourceThemeKey !== theme.key) {
                    return false;
                }
                const sourceFile = templatePage.sourceFile ?? content.sourceFile;
                if (content.sourceFile !== sourceFile) {
                    return false;
                }
                return !expectedTemplateSections.has([
                    section.sectionType,
                    content.sourceFile,
                    Number(content.sourceIndex ?? -1),
                ].join('|'));
            }).map((section) => cmsRepository.deleteSection(eventId, section.id, req.user.id)));
        }
        const targetPages = knownPages.filter((page) => targetPageSlugs.has(page.slug || 'home'));
        const targetPageIds = new Set(targetPages.map((page) => page.id));
        const obsoleteTemplateSections = sections.filter((section) => {
            const content = toObject(section.content);
            return Boolean(content.sourceThemeKey)
                && content.sourceThemeKey !== theme.key
                && (!section.pageId || targetPageIds.has(section.pageId));
        });
        await Promise.all(obsoleteTemplateSections.map((section) => (cmsRepository.deleteSection(eventId, section.id, req.user.id))));
        const obsoleteTemplatePages = pages.filter((page) => (templateOwnedPageIds.has(page.id) && !targetPageSlugs.has(page.slug || 'home')));
        await Promise.all(obsoleteTemplatePages.map((page) => (cmsRepository.archivePageForThemeChange(eventId, page.id, req.user.id))));
        const settings = await siteRepository.updateSettings(eventId, {
            themeId: theme.id,
            globalStyles: theme.globalStyles,
        });
        return (0, api_response_1.sendSuccess)(res, 'Site theme applied successfully', { theme, settings });
    }
    const settings = await siteRepository.updateSettings(eventId, {
        themeId: theme.id,
        globalStyles: theme.globalStyles,
    });
    const templateSections = getTemplateSections(theme.template);
    await Promise.all(Object.entries(templateSections).map(async ([sectionType, templateSection], index) => {
        const matchingSections = sections.filter((section) => section.sectionType === sectionType);
        if (matchingSections.length) {
            await Promise.all(matchingSections.map((section) => cmsRepository.updateSection(eventId, section.id, {
                title: templateSection.title ?? section.title,
                content: templateSection.content ?? {},
                status: section.status,
                updatedBy: req.user.id,
            })));
            return;
        }
        await cmsRepository.createSection(eventId, {
            pageId: homePage?.id,
            sectionType,
            title: templateSection.title ?? sectionType,
            content: templateSection.content ?? {},
            status: 'draft',
            sortOrder: 200 + index,
            createdBy: req.user.id,
        });
    }));
    return (0, api_response_1.sendSuccess)(res, 'Site theme applied successfully', { theme, settings });
}));
exports.publicSiteStudioRouter.get(/^\/site-template-screenshot\/([^/]+)\/(.+)$/, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const templateKey = String(req.params[0] ?? '');
    const requestedPath = String(req.params[1] ?? '').replace(/\\/g, '/');
    if (!templateKey || requestedPath.includes('..') || path_1.default.isAbsolute(requestedPath) || path_1.default.extname(requestedPath).toLowerCase() !== '.html') {
        throw new app_error_1.AppError('Template screenshot not found', 404, 'TEMPLATE_SCREENSHOT_NOT_FOUND');
    }
    const rootPath = path_1.default.resolve(process.cwd(), env_1.env.FILE_STORAGE_PATH, 'site-templates', templateKey);
    const htmlPath = path_1.default.resolve(rootPath, requestedPath);
    const safeRoot = `${rootPath}${path_1.default.sep}`;
    if (htmlPath !== rootPath && !htmlPath.startsWith(safeRoot)) {
        throw new app_error_1.AppError('Template screenshot not found', 404, 'TEMPLATE_SCREENSHOT_NOT_FOUND');
    }
    if (!fs_1.default.existsSync(htmlPath) || !fs_1.default.statSync(htmlPath).isFile()) {
        throw new app_error_1.AppError('Template screenshot not found', 404, 'TEMPLATE_SCREENSHOT_NOT_FOUND');
    }
    const screenshotPath = await (0, template_preview_service_1.ensureTemplateScreenshot)({ rootPath, sourceFile: requestedPath });
    if (!screenshotPath) {
        throw new app_error_1.AppError('Template screenshot unavailable', 404, 'TEMPLATE_SCREENSHOT_UNAVAILABLE');
    }
    return res.sendFile(path_1.default.resolve(rootPath, screenshotPath));
}));
exports.publicSiteStudioRouter.get(/^\/site-template-demo\/([^/]+)\/(.+)$/, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const templateKey = String(req.params[0] ?? '');
    const requestedPath = String(req.params[1] ?? '').replace(/\\/g, '/');
    if (!templateKey || requestedPath.includes('..') || path_1.default.isAbsolute(requestedPath) || path_1.default.extname(requestedPath).toLowerCase() !== '.html') {
        throw new app_error_1.AppError('Template demo not found', 404, 'TEMPLATE_DEMO_NOT_FOUND');
    }
    const rootPath = path_1.default.resolve(process.cwd(), env_1.env.FILE_STORAGE_PATH, 'site-templates', templateKey);
    const assetPath = path_1.default.resolve(rootPath, requestedPath);
    const safeRoot = `${rootPath}${path_1.default.sep}`;
    if (assetPath !== rootPath && !assetPath.startsWith(safeRoot)) {
        throw new app_error_1.AppError('Template demo not found', 404, 'TEMPLATE_DEMO_NOT_FOUND');
    }
    if (!fs_1.default.existsSync(assetPath) || !fs_1.default.statSync(assetPath).isFile()) {
        throw new app_error_1.AppError('Template demo not found', 404, 'TEMPLATE_DEMO_NOT_FOUND');
    }
    const html = fs_1.default.readFileSync(assetPath, 'utf8');
    return res.type('html').send(rewriteTemplateDemoHtml(html, templateKey, requestedPath));
}));
exports.publicSiteStudioRouter.get(/^\/site-template-assets\/([^/]+)\/(.+)$/, (0, async_handler_1.asyncHandler)(async (req, res) => {
    const templateKey = String(req.params[0] ?? '');
    const requestedPath = String(req.params[1] ?? '').replace(/\\/g, '/');
    if (!templateKey || requestedPath.includes('..') || path_1.default.isAbsolute(requestedPath)) {
        throw new app_error_1.AppError('Template asset not found', 404, 'TEMPLATE_ASSET_NOT_FOUND');
    }
    const rootPath = path_1.default.resolve(process.cwd(), env_1.env.FILE_STORAGE_PATH, 'site-templates', templateKey);
    const assetPath = path_1.default.resolve(rootPath, requestedPath);
    const safeRoot = `${rootPath}${path_1.default.sep}`;
    if (assetPath !== rootPath && !assetPath.startsWith(safeRoot)) {
        throw new app_error_1.AppError('Template asset not found', 404, 'TEMPLATE_ASSET_NOT_FOUND');
    }
    if (!fs_1.default.existsSync(assetPath) || !fs_1.default.statSync(assetPath).isFile()) {
        throw new app_error_1.AppError('Template asset not found', 404, 'TEMPLATE_ASSET_NOT_FOUND');
    }
    return res.sendFile(assetPath);
}));
exports.siteStudioRouter.get('/events/:eventId/site/plugins', (0, require_permission_middleware_1.requirePermission)('site_studio.read'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_studio_schemas_1.siteEventParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const plugins = await siteRepository.listInstalledPlugins(eventId);
    return (0, api_response_1.sendSuccess)(res, 'Installed plugins retrieved successfully', plugins);
}));
exports.siteStudioRouter.post('/events/:eventId/site/plugins/:pluginId/install', (0, require_permission_middleware_1.requirePermission)('site_studio.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId, pluginId } = site_studio_schemas_1.pluginParamsSchema.parse(req.params);
    await ensureEvent(eventId);
    const plugin = await siteRepository.installPlugin(eventId, pluginId, req.user.id);
    if (!plugin) {
        throw new app_error_1.AppError('Site plugin not found', 404, 'SITE_PLUGIN_NOT_FOUND');
    }
    const existingSections = await cmsRepository.listSections(eventId);
    const alreadyHasBlock = existingSections.some((section) => section.sectionType === plugin.sectionType);
    if (!alreadyHasBlock) {
        await cmsRepository.createSection(eventId, {
            sectionType: plugin.sectionType,
            title: plugin.defaultTitle ?? plugin.name,
            content: plugin.defaultContent,
            status: 'draft',
            sortOrder: plugin.sortOrder,
            createdBy: req.user.id,
        });
    }
    await siteRepository.snapshot(eventId, 'plugin_installed', req.user.id);
    return (0, api_response_1.sendSuccess)(res, 'Site plugin installed successfully', plugin, 201);
}));
exports.siteStudioRouter.post('/events/:eventId/site/publish', (0, require_permission_middleware_1.requirePermission)('site_studio.manage'), (0, async_handler_1.asyncHandler)(async (req, res) => {
    const { eventId } = site_studio_schemas_1.siteEventParamsSchema.parse(req.params);
    const event = await ensureEvent(eventId);
    const [pages, sections] = await Promise.all([
        cmsRepository.listPages(eventId),
        cmsRepository.listSections(eventId),
    ]);
    await siteRepository.snapshot(eventId, 'published', req.user.id);
    await Promise.all([
        ...pages.map((page) => cmsRepository.updatePage(eventId, page.id, { status: 'published', updatedBy: req.user.id })),
        ...sections.map((section) => cmsRepository.updateSection(eventId, section.id, { status: 'published', updatedBy: req.user.id })),
        siteRepository.updateSettings(eventId, { status: 'published' }),
        event.status !== 'published' ? eventsRepository.publishEvent(eventId, req.user.id) : Promise.resolve(event),
    ]);
    return (0, api_response_1.sendSuccess)(res, 'Site published successfully');
}));
exports.publicSiteStudioRouter.get('/events/:slug/site', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const event = await eventsRepository.findPublishedBySlug(String(req.params.slug));
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const [settings, pages, sections, navigation] = await Promise.all([
        siteRepository.getSettings(event.id),
        cmsRepository.listPages(event.id),
        cmsRepository.listSections(event.id, true),
        siteRepository.listNavigation(event.id, true),
    ]);
    const activeThemeId = settings.themeId;
    const activeThemeKey = settings.theme?.key;
    const templateOwnedPageIds = new Set(sections
        .filter((section) => isTemplateSection(toObject(section.content)))
        .map((section) => section.pageId)
        .filter((pageId) => Boolean(pageId)));
    const activeTemplatePageIds = new Set(sections
        .filter((section) => matchesActiveTheme(toObject(section.content), activeThemeId, activeThemeKey))
        .map((section) => section.pageId)
        .filter((pageId) => Boolean(pageId)));
    const activeSections = sections.filter((section) => {
        const content = toObject(section.content);
        if (isTemplateSection(content)) {
            return matchesActiveTheme(content, activeThemeId, activeThemeKey);
        }
        return !section.pageId
            || !templateOwnedPageIds.has(section.pageId)
            || activeTemplatePageIds.has(section.pageId);
    });
    const activePages = pages.filter((page) => {
        if (templateOwnedPageIds.has(page.id)) {
            return activeTemplatePageIds.has(page.id);
        }
        return page.status === 'published';
    });
    return (0, api_response_1.sendSuccess)(res, 'Public site retrieved successfully', {
        settings,
        pages: activePages,
        sections: activeSections,
        navigation,
    });
}));
//# sourceMappingURL=site-studio.routes.js.map