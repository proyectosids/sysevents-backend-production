"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiDocument = void 0;
exports.openApiDocument = {
    openapi: '3.0.0',
    info: {
        title: 'SysEvents API',
        version: '1.0.0',
        description: 'Backend API for academic events SaaS.',
    },
    servers: [{ url: '/api' }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            ApiSuccess: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { type: 'object' },
                },
            },
            ApiError: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' },
                    errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
                },
            },
        },
    },
    security: [{ bearerAuth: [] }],
    paths: {
        '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
        '/auth/login': { post: { summary: 'Login', responses: { '200': { description: 'Login successful' } } } },
        '/events': {
            get: { summary: 'List events', responses: { '200': { description: 'Events' } } },
            post: { summary: 'Create event', responses: { '201': { description: 'Created' } } },
        },
        '/files/upload': { post: { summary: 'Upload file', responses: { '201': { description: 'Uploaded' } } } },
        '/events/{eventId}/submissions': { post: { summary: 'Create submission', responses: { '201': { description: 'Created' } } } },
        '/submissions/{id}/submit': { post: { summary: 'Submit academic work', responses: { '200': { description: 'Submitted' } } } },
        '/submissions/{id}/assign-reviewer': { post: { summary: 'Assign reviewer', responses: { '201': { description: 'Assigned' } } } },
        '/reviews/{id}/submit': { post: { summary: 'Submit review', responses: { '200': { description: 'Submitted' } } } },
        '/events/{eventId}/reports/summary': { get: { summary: 'Event summary report', responses: { '200': { description: 'Report' } } } },
    },
};
//# sourceMappingURL=openapi.js.map