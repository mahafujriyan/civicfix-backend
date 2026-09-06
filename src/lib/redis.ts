import Redis from 'ioredis';
import { env, isTest } from '../config/env';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis | null {
  if (isTest) {
    return null;
  }

  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 8) {
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    redis.on('error', (err) => {
      redisAvailable = false;
      console.warn('[redis] connection error:', err.message);
    });

    redis.on('connect', () => {
      redisAvailable = true;
      console.info('[redis] connected');
    });

    redis.on('ready', () => {
      redisAvailable = true;
    });

    redis.on('close', () => {
      redisAvailable = false;
      console.warn('[redis] connection closed');
    });
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
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error('Unexpected Redis ping response');
    }
    redisAvailable = true;
    console.info(`[redis] ready at ${env.REDIS_URL}`);
  } catch (error) {
    redisAvailable = false;
    console.warn('[redis] unavailable — cache/rate-limit will use memory fallback');
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

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) {
    return null;
  }
  const client = getRedis();
  if (!client) {
    return null;
  }
  const value = await client.get(key).catch(() => null);
  if (!value) {
    return null;
  }
  return JSON.parse(value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isRedisAvailable()) {
    return;
  }
  const client = getRedis();
  if (!client) {
    return;
  }
  await client.set(key, JSON.stringify(value), 'EX', ttlSeconds).catch(() => undefined);
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!isRedisAvailable() || keys.length === 0) {
    return;
  }
  const client = getRedis();
  if (!client) {
    return;
  }
  await client.del(...keys).catch(() => undefined);
}
