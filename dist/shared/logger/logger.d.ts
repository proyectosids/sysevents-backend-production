type LogContext = Record<string, unknown>;
export declare const logger: {
    info(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, context?: LogContext): void;
};
export {};
