import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error';
import { sendError } from '../utils/response';
import { env, isProduction } from '../config/env';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    sendError({
      res,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof ZodError) {
    sendError({
      res,
      statusCode: 400,
      message: 'Validation failed',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : 'field';
      sendError({
        res,
        statusCode: 409,
        message: `Duplicate resource: ${target} already exists`,
      });
      return;
    }

    if (err.code === 'P2025') {
      sendError({
        res,
        statusCode: 404,
        message: 'Resource not found',
      });
      return;
    }

    sendError({
      res,
      statusCode: 400,
      message: 'Database request failed',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError({
      res,
      statusCode: 400,
      message: 'Invalid database query',
    });
    return;
  }

  if (typeof err === 'object' && err !== null && 'type' in err) {
    const stripeLike = err as { type?: string; message?: string };
    if (stripeLike.type?.startsWith('Stripe')) {
      sendError({
        res,
        statusCode: 400,
        message: stripeLike.message || 'Payment provider error',
      });
      return;
    }
  }

  if (!isProduction) {
    console.error(err);
  } else {
    console.error('Unhandled error');
  }

  sendError({
    res,
    statusCode: 500,
    message: env.NODE_ENV === 'production' ? 'Internal server error' : getErrorMessage(err),
  });
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return 'Internal server error';
}
