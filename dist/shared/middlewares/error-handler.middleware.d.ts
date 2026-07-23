import { NextFunction, Request, Response } from 'express';
export declare function errorHandlerMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction): Response<any, Record<string, any>>;
