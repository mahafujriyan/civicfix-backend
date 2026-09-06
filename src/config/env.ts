import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  STRIPE_SUCCESS_URL: z.string().optional().default('http://localhost:5000/api/v1/payments/success'),
  STRIPE_CANCEL_URL: z.string().optional().default('http://localhost:5000/api/v1/payments/cancel'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().optional().default('*'),
  SEED_ADMIN_EMAIL: z.string().email().optional().default('admin@civicfix.local'),
  SEED_ADMIN_PASSWORD: z.string().optional().default('Admin@12345'),
  SEED_STAFF_PASSWORD: z.string().optional().default('Staff@12345'),
  SEED_CITIZEN_PASSWORD: z.string().optional().default('Citizen@12345'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment variables: ${details}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
