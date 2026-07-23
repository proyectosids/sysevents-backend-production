"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicCmsRouter = void 0;
const express_1 = require("express");
const app_error_1 = require("../../../shared/errors/app-error");
const async_handler_1 = require("../../../shared/utils/async-handler");
const api_response_1 = require("../../../shared/utils/api-response");
const events_repository_1 = require("../../events/infrastructure/repositories/events.repository");
const site_studio_repository_1 = require("../../site-studio/infrastructure/repositories/site-studio.repository");
const cms_repository_1 = require("../infrastructure/repositories/cms.repository");
exports.publicCmsRouter = (0, express_1.Router)();
const cmsRepository = new cms_repository_1.CmsRepository();
const eventsRepository = new events_repository_1.EventsRepository();
const siteStudioRepository = new site_studio_repository_1.SiteStudioRepository();
function sectionContent(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
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
exports.publicCmsRouter.get('/events/:slug/pages', (0, async_handler_1.asyncHandler)(async (req, res) => {
    const event = await eventsRepository.findPublishedBySlug(String(req.params.slug));
    if (!event) {
        throw new app_error_1.AppError('Event not found', 404, 'EVENT_NOT_FOUND');
    }
    const [pages, sections, settings] = await Promise.all([
        cmsRepository.listPages(event.id),
        cmsRepository.listSections(event.id, true),
        siteStudioRepository.getSettings(event.id),
    ]);
    const activeThemeId = settings.themeId;
    const activeThemeKey = settings.theme?.key;
    const templateOwnedPageIds = new Set(sections
        .filter((section) => isTemplateSection(sectionContent(section.content)))
        .map((section) => section.pageId)
        .filter((pageId) => Boolean(pageId)));
    const activeTemplatePageIds = new Set(sections
        .filter((section) => matchesActiveTheme(sectionContent(section.content), activeThemeId, activeThemeKey))
        .map((section) => section.pageId)
        .filter((pageId) => Boolean(pageId)));
    const activeSections = sections.filter((section) => {
        const content = sectionContent(section.content);
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
    return (0, api_response_1.sendSuccess)(res, 'Public event pages retrieved successfully', { pages: activePages, sections: activeSections });
}));
//# sourceMappingURL=public-cms.routes.js.map