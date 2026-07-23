import { Response } from 'express';
export declare function sendSuccess<T>(res: Response, message: string, data?: T, statusCode?: number): Response<any, Record<string, any>>;
export declare function sendError(res: Response, message: string, errorCode: string, statusCode: number, details?: unknown): Response<any, Record<string, any>>;
