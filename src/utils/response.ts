import { Response } from 'express';

interface SuccessOptions<T> {
  res: Response;
  message?: string;
  data?: T;
  statusCode?: number;
}

interface ErrorOptions {
  res: Response;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
  statusCode?: number;
}

export function sendSuccess<T>({
  res,
  message = 'Operation successful',
  data,
  statusCode = 200,
}: SuccessOptions<T>): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  });
}

export function sendError({
  res,
  message,
  errors = [],
  statusCode = 500,
}: ErrorOptions): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}
