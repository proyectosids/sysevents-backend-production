"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../../../config/env");
const logger_1 = require("../../../../shared/logger/logger");
const communications_repository_1 = require("../../infrastructure/repositories/communications.repository");
function renderTemplate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => variables[key] ?? '');
}
function optionalEnv(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
function getSmtpConfig() {
    const user = optionalEnv(env_1.env.SMTP_USER) ?? optionalEnv(env_1.env.AUTH_EMAIL);
    return {
        host: optionalEnv(env_1.env.SMTP_HOST),
        port: env_1.env.SMTP_PORT,
        from: optionalEnv(env_1.env.SMTP_FROM) ?? optionalEnv(env_1.env.AUTH_EMAIL),
        user,
        password: optionalEnv(env_1.env.SMTP_PASSWORD) ?? optionalEnv(env_1.env.AUTH_PASS_APP) ?? optionalEnv(env_1.env.AUTH_PASS),
    };
}
class EmailService {
    communicationsRepository;
    constructor(communicationsRepository = new communications_repository_1.CommunicationsRepository()) {
        this.communicationsRepository = communicationsRepository;
    }
    async sendTemplate(templateKey, recipientEmail, variables = {}) {
        const template = await this.communicationsRepository.findTemplateByKey(templateKey);
        if (!template || !template.isActive) {
            return { status: 'skipped', reason: 'Email template is not active' };
        }
        const subject = renderTemplate(template.subject, variables);
        const body = renderTemplate(template.body, variables);
        const logId = await this.communicationsRepository.createEmailLog({
            templateKey,
            recipientEmail,
            subject,
        });
        const smtp = getSmtpConfig();
        if (!smtp.host || !smtp.from) {
            await this.communicationsRepository.updateEmailLog(logId, 'failed', 'SMTP is not configured');
            return { status: 'failed', reason: 'SMTP is not configured' };
        }
        try {
            const transporter = nodemailer_1.default.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.port === 465,
                auth: smtp.user
                    ? {
                        user: smtp.user,
                        pass: smtp.password,
                    }
                    : undefined,
            });
            await transporter.sendMail({
                from: smtp.from,
                to: recipientEmail,
                subject,
                text: body,
            });
            await this.communicationsRepository.updateEmailLog(logId, 'sent');
            return { status: 'sent' };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.warn('Email delivery failed', { templateKey, recipientEmail, error: message });
            await this.communicationsRepository.updateEmailLog(logId, 'failed', message);
            return { status: 'failed', reason: message };
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=email.service.js.map