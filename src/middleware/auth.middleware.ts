import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/api-error';
import { prisma } from '../lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
}

declare global {
  // Express request augmentation for authenticated user
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized('Invalid authentication');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
