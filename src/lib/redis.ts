import { Redis } from '@upstash/redis';
import { env, isTest } from '../config/env';

let redis: Redis | null = null;
let redisAvailable = false;

function hasUpstashConfig(): boolean {
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis | null {
  if (isTest || !hasUpstashConfig()) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  if (!hasUpstashConfig()) {
    redisAvailable = false;
    console.warn(
      '[redis] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing — using memory fallback',
    );
    return;
  }

  const client = getRedis();
  if (!client) {
    return;
  }

  try {
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected Redis ping response: ${String(pong)}`);
    }
    redisAvailable = true;
    console.info('[redis] Upstash REST connected');
  } catch (error) {
    redisAvailable = false;
    console.warn('[redis] Upstash unavailable — cache/rate-limit will use memory fallback');
    if (error instanceof Error) {
      console.warn(error.message);
    }
  }
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}

export async function disconnectRedis(): Promise<void> {
  // Upstash REST client is HTTP-based; nothing to close.
  redis = null;
  redisAvailable = false;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisAvailable()) {
    return null;
  }
  const client = getRedis();
  if (!client) {
    return null;
  }

  try {
    const value = await client.get<T>(key);
    return value ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isRedisAvailable()) {
    return;
  }
  const client = getRedis();
  if (!client) {
    return;
  }

  await client.set(key, value, { ex: ttlSeconds }).catch(() => undefined);
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

export async function rateLimitIncr(key: string, windowMs: number): Promise<number | null> {
  if (!isRedisAvailable()) {
    return null;
  }
  const client = getRedis();
  if (!client) {
    return null;
  }

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.pexpire(key, windowMs);
    }
    return count;
  } catch {
    return null;
  }
}
