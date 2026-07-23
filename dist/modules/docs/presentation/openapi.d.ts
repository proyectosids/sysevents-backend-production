export declare const openApiDocument: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
    }[];
    components: {
        securitySchemes: {
            bearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
            };
        };
        schemas: {
            ApiSuccess: {
                type: string;
                properties: {
                    success: {
                        type: string;
                        example: boolean;
                    };
                    message: {
                        type: string;
                    };
                    data: {
                        type: string;
                    };
                };
            };
            ApiError: {
                type: string;
                properties: {
                    success: {
                        type: string;
                        example: boolean;
                    };
                    message: {
                        type: string;
                    };
                    errorCode: {
                        type: string;
                        example: string;
                    };
                };
            };
        };
    };
    security: {
        bearerAuth: never[];
    }[];
    paths: {
        '/health': {
            get: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/auth/login': {
            post: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/events': {
            get: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/files/upload': {
            post: {
                summary: string;
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/events/{eventId}/submissions': {
            post: {
                summary: string;
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/submissions/{id}/submit': {
            post: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/submissions/{id}/assign-reviewer': {
            post: {
                summary: string;
                responses: {
                    '201': {
                        description: string;
                    };
                };
            };
        };
        '/reviews/{id}/submit': {
            post: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
        '/events/{eventId}/reports/summary': {
            get: {
                summary: string;
                responses: {
                    '200': {
                        description: string;
                    };
                };
            };
        };
    };
};
