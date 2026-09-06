import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId = typeof incoming === 'string' && incoming.trim() ? incoming : randomUUID();
  res.setHeader('x-request-id', requestId);
  (req as Request & { requestId?: string }).requestId = requestId;
  next();
}
