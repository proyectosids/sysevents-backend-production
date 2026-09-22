"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./shared/logger/logger");
const registrations_repository_1 = require("./modules/registrations/infrastructure/repositories/registrations.repository");
const app = (0, app_1.createApp)();
const registrationsRepository = new registrations_repository_1.RegistrationsRepository();
if (env_1.env.NODE_ENV !== 'test') {
    const certificateTimer = setInterval(() => {
        void registrationsRepository.issueDueCertificates().catch((error) => {
            logger_1.logger.error('Automatic certificate issuance failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }, 5 * 60 * 1000);
    certificateTimer.unref();
    void registrationsRepository.issueDueCertificates().catch((error) => {
        logger_1.logger.warn('Initial automatic certificate issuance skipped', {
            error: error instanceof Error ? error.message : String(error),
        });
    });
}
app.listen(env_1.env.PORT, env_1.env.SERVER_HOST, () => {
    logger_1.logger.info(`${env_1.env.APP_NAME} running`, {
        host: env_1.env.SERVER_HOST,
        port: env_1.env.PORT,
        environment: env_1.env.NODE_ENV,
    });
});
//# sourceMappingURL=server.js.map