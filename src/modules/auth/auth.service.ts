import { AuthProvider, Role, User } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';
import { hashPassword, comparePassword } from '../../utils/password';
import { signAccessToken } from '../../utils/jwt';
import { GoogleAuthInput, LoginInput, RegisterInput } from './auth.validation';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

type SafeUser = Omit<User, 'passwordHash'>;

function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

async function writeAuditLog(actorId: string, action: string, entityId: string) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entity: 'User',
      entityId,
    },
  });
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw ApiError.conflict('Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      role: Role.CITIZEN,
      provider: AuthProvider.LOCAL,
    },
  });

  await writeAuditLog(user.id, 'USER_REGISTERED', user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account is deactivated');
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  await writeAuditLog(user.id, 'USER_LOGIN', user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
  };
}

export async function loginWithGoogle(input: GoogleAuthInput) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw ApiError.badRequest('Google authentication is not configured');
  }

  let payloadEmail: string | undefined;
  let googleId: string | undefined;
  let fullName = 'Google User';

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: input.idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw ApiError.unauthorized('Invalid Google token');
    }
    payloadEmail = payload.email.toLowerCase();
    googleId = payload.sub;
    fullName = payload.name || payload.email.split('@')[0] || fullName;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw ApiError.unauthorized('Failed to verify Google token');
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId }, { email: payloadEmail }],
    },
  });

  if (user && !user.isActive) {
    throw ApiError.forbidden('Account is deactivated');
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: payloadEmail,
        fullName,
        googleId,
        role: Role.CITIZEN,
        provider: AuthProvider.GOOGLE,
      },
    });
    await writeAuditLog(user.id, 'USER_REGISTERED_GOOGLE', user.id);
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId,
        provider: user.provider === AuthProvider.LOCAL ? AuthProvider.LOCAL : AuthProvider.GOOGLE,
      },
    });
  }

  await writeAuditLog(user.id, 'USER_LOGIN_GOOGLE', user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: sanitizeUser(user),
    accessToken,
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: {
        select: { id: true, name: true },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}
