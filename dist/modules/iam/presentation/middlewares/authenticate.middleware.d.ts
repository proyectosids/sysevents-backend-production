import { NextFunction, Request, Response } from 'express';
export declare function authenticateMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void>;
