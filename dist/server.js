"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./shared/logger/logger");
const app = (0, app_1.createApp)();
app.listen(env_1.env.PORT, env_1.env.SERVER_HOST, () => {
    logger_1.logger.info(`${env_1.env.APP_NAME} running`, {
        host: env_1.env.SERVER_HOST,
        port: env_1.env.PORT,
        environment: env_1.env.NODE_ENV,
    });
});
//# sourceMappingURL=server.js.map