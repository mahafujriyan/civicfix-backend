import { Request, Response, NextFunction } from 'express';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { ApiError } from '../utils/api-error';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

const memoryHits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit({ windowMs, max, keyPrefix }: RateLimitOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${identifier}`;

      if (isRedisAvailable()) {
        const redis = getRedis();
        if (redis) {
          const count = await redis.incr(key);
          if (count === 1) {
            await redis.pexpire(key, windowMs);
          }
          if (count > max) {
            throw ApiError.tooManyRequests('Too many requests, please try again later');
          }
          next();
          return;
        }
      }

      const now = Date.now();
      const current = memoryHits.get(key);
      if (!current || current.resetAt <= now) {
        memoryHits.set(key, { count: 1, resetAt: now + windowMs });
        next();
        return;
      }

      current.count += 1;
      if (current.count > max) {
        throw ApiError.tooManyRequests('Too many requests, please try again later');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
