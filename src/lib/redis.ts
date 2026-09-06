import Redis from 'ioredis';
import { env, isTest } from '../config/env';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis | null {
  if (isTest) {
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      redis.on('error', (err) => {
        redisAvailable = false;
        console.warn('[redis] connection error:', err.message);
      });

      redis.on('connect', () => {
        redisAvailable = true;
      });
    } catch (error) {
      console.warn('[redis] failed to initialize:', error);
      redis = null;
      redisAvailable = false;
    }
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    if (client.status === 'wait' || client.status === 'end') {
      await client.connect();
    }
    await client.ping();
    redisAvailable = true;
  } catch (error) {
    redisAvailable = false;
    console.warn('[redis] unavailable, continuing without cache/rate-limit store');
    if (error instanceof Error) {
      console.warn(error.message);
    }
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit().catch(() => undefined);
    redis = null;
    redisAvailable = false;
  }
}
