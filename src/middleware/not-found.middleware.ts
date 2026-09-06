import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}
