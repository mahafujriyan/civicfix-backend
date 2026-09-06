import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/api-error';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          ApiError.badRequest(
            'Validation failed',
            error.issues.map((issue) => ({
              field: issue.path.join('.') || part,
              message: issue.message,
            })),
          ),
        );
        return;
      }
      next(error);
    }
  };
}
