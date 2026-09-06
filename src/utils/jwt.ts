import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '@prisma/client';
import { ApiError } from './api-error';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) {
      throw ApiError.unauthorized('Invalid token');
    }

    const { sub, email, role } = decoded as Partial<JwtPayload>;
    if (!sub || !email || !role) {
      throw ApiError.unauthorized('Invalid token payload');
    }

    return { sub, email, role };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized('Invalid or expired token');
  }
}
