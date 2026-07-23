import { NextFunction, Request, Response } from 'express';
export declare function optionalAuthenticateMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void>;
