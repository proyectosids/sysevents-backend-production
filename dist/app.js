"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const cms_routes_1 = require("./modules/cms/presentation/cms.routes");
const public_cms_routes_1 = require("./modules/cms/presentation/public-cms.routes");
const communications_routes_1 = require("./modules/communications/presentation/communications.routes");
const docs_routes_1 = require("./modules/docs/presentation/docs.routes");
const events_routes_1 = require("./modules/events/presentation/events.routes");
const public_events_routes_1 = require("./modules/events/presentation/public-events.routes");
const files_routes_1 = require("./modules/files/presentation/files.routes");
const auth_routes_1 = require("./modules/iam/presentation/auth.routes");
const permissions_routes_1 = require("./modules/iam/presentation/permissions.routes");
const roles_routes_1 = require("./modules/iam/presentation/roles.routes");
const users_routes_1 = require("./modules/iam/presentation/users.routes");
const health_routes_1 = require("./modules/health/presentation/health.routes");
const rate_limiters_1 = require("./modules/security/presentation/rate-limiters");
const payments_routes_1 = require("./modules/payments/presentation/payments.routes");
const registrations_routes_1 = require("./modules/registrations/presentation/registrations.routes");
const reports_routes_1 = require("./modules/reports/presentation/reports.routes");
const reviews_routes_1 = require("./modules/reviews/presentation/reviews.routes");
const saas_routes_1 = require("./modules/saas/presentation/saas.routes");
const site_data_routes_1 = require("./modules/site-data/presentation/site-data.routes");
const site_studio_routes_1 = require("./modules/site-studio/presentation/site-studio.routes");
const tenants_routes_1 = require("./modules/tenants/presentation/tenants.routes");
const translations_routes_1 = require("./modules/translations/presentation/translations.routes");
const submissions_routes_1 = require("./modules/submissions/presentation/submissions.routes");
const error_handler_middleware_1 = require("./shared/middlewares/error-handler.middleware");
const not_found_middleware_1 = require("./shared/middlewares/not-found.middleware");
const sanitize_middleware_1 = require("./shared/middlewares/sanitize.middleware");
const api_response_1 = require("./shared/utils/api-response");
const corsOrigins = env_1.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
function createApp() {
    const app = (0, express_1.default)();
    // CapRover forwards requests through a single reverse proxy. Trust that hop so
    // Express and express-rate-limit use the original client IP from X-Forwarded-For.
    app.set('trust proxy', 1);
    app.use((0, cors_1.default)({
        origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
        credentials: true,
    }));
    app.use(rate_limiters_1.globalRateLimiter);
    app.use('/api/payments/stripe/webhook', express_1.default.raw({ type: 'application/json' }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(sanitize_middleware_1.sanitizeMiddleware);
    app.get('/', (_req, res) => {
        return (0, api_response_1.sendSuccess)(res, 'Welcome to SysEvents API', {
            app: env_1.env.APP_NAME,
        });
    });
    app.use('/api/health', health_routes_1.healthRouter);
    app.use('/api/public', saas_routes_1.publicSaasRouter);
    app.use('/api/saas', saas_routes_1.saasRouter);
    app.use('/api', site_studio_routes_1.siteStudioRouter);
    app.use('/api/auth', auth_routes_1.authRouter);
    app.use('/api/users', users_routes_1.usersRouter);
    app.use('/api/roles', roles_routes_1.rolesRouter);
    app.use('/api/permissions', permissions_routes_1.permissionsRouter);
    app.use('/api/tenants', tenants_routes_1.tenantsRouter);
    app.use('/api/translations', translations_routes_1.translationsRouter);
    app.use('/api/events', events_routes_1.eventsRouter);
    app.use('/api/events', cms_routes_1.cmsRouter);
    app.use('/api/events', site_data_routes_1.siteDataRouter);
    app.use('/api/events', registrations_routes_1.registrationsRouter);
    app.use('/api/events', payments_routes_1.paymentsRouter);
    app.use('/api/me', registrations_routes_1.myRegistrationsRouter);
    app.use('/api/me', payments_routes_1.myPaymentsRouter);
    app.use('/api/payments', payments_routes_1.paymentWebhooksRouter);
    app.use('/webhooks', payments_routes_1.paymentWebhooksRouter);
    app.use('/api/files', files_routes_1.filesRouter);
    app.use('/api/events', submissions_routes_1.submissionTypesRouter);
    app.use('/api/submissions', submissions_routes_1.submissionsRouter);
    app.use('/api/me', submissions_routes_1.mySubmissionsRouter);
    app.use('/api', reviews_routes_1.reviewsRouter);
    app.use('/api/me', reviews_routes_1.myReviewsRouter);
    app.use('/api', communications_routes_1.communicationsRouter);
    app.use('/api/events', reports_routes_1.reportsRouter);
    app.use('/api', docs_routes_1.docsRouter);
    app.use('/api/public', public_events_routes_1.publicEventsRouter);
    app.use('/api/public', site_data_routes_1.publicSiteDataRouter);
    app.use('/api/public', public_cms_routes_1.publicCmsRouter);
    app.use('/api/public', site_studio_routes_1.publicSiteStudioRouter);
    app.use('/api/public/files', files_routes_1.publicFilesRouter);
    app.use(not_found_middleware_1.notFoundMiddleware);
    app.use(error_handler_middleware_1.errorHandlerMiddleware);
    return app;
}
//# sourceMappingURL=app.js.map