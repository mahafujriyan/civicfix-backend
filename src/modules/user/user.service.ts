import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { getPaginationMeta, getSkipTake } from '../../utils/pagination';
import { omitPassword } from '../../utils/user.serializer';
import { UpdateProfileInput, UpdateUserStatusInput, UserListQuery } from './user.validation';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return omitPassword(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: input.fullName,
      phone: input.phone === undefined ? undefined : input.phone,
    },
    include: { department: { select: { id: true, name: true } } },
  });
  return omitPassword(user);
}

export async function listUsers(query: UserListQuery) {
  const { page, limit, search, role, sortBy, sortOrder } = query;
  const { skip, take } = getSkipTake(page, limit);

  const where = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: { department: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    items: users.map(omitPassword),
    meta: getPaginationMeta(page, limit, total),
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return omitPassword(user);
}

export async function updateUserStatus(
  actorId: string,
  userId: string,
  input: UpdateUserStatusInput,
) {
  if (actorId === userId) {
    throw ApiError.badRequest('You cannot change your own active status');
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    throw ApiError.notFound('User not found');
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { isActive: input.isActive },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: input.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity: 'User',
        entityId: userId,
      },
    });

    return updated;
  });

  return omitPassword(user);
}
