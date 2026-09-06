import { Router, Request, Response } from 'express';
import { sendSuccess } from '../utils/response';
import { isRedisAvailable } from '../lib/redis';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  let database: 'ok' | 'error' = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'error';
  }

  sendSuccess({
    res,
    message: 'API is healthy',
    data: {
      status: 'ok',
      database,
      redis: isRedisAvailable() ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
