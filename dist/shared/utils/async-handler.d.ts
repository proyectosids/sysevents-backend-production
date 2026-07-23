import { NextFunction, Request, Response } from 'express';
type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
export declare function asyncHandler(controller: AsyncController): (req: Request, res: Response, next: NextFunction) => void;
export {};
