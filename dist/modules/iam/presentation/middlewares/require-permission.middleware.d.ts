import { NextFunction, Request, Response } from 'express';
export declare function requirePermission(permission: string): (req: Request, _res: Response, next: NextFunction) => void;
