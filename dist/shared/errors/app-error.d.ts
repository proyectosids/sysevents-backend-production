export declare class AppError extends Error {
    readonly statusCode: number;
    readonly errorCode: string;
    readonly details?: unknown;
    constructor(message: string, statusCode?: number, errorCode?: string, details?: unknown);
}
