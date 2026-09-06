import { prisma } from '../../lib/prisma';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { ApiError } from '../../utils/api-error';
import { getPaginationMeta, getSkipTake } from '../../utils/pagination';
import {
  DepartmentCreateInput,
  DepartmentListQuery,
  DepartmentUpdateInput,
} from './department.validation';

const CACHE_KEY = 'cache:departments:active';
const CACHE_TTL_SECONDS = 300;

async function invalidateDepartmentCache() {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  if (redis) {
    await redis.del(CACHE_KEY).catch(() => undefined);
  }
}

export async function createDepartment(actorId: string, input: DepartmentCreateInput) {
  const department = await prisma.$transaction(async (tx) => {
    const created = await tx.department.create({ data: input });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'DEPARTMENT_CREATED',
        entity: 'Department',
        entityId: created.id,
      },
    });
    return created;
  });

  await invalidateDepartmentCache();
  return department;
}

export async function listDepartments(query: DepartmentListQuery) {
  const { page, limit, search, sortBy, sortOrder, isActive } = query;
  const { skip, take } = getSkipTake(page, limit);

  const where = {
    ...(isActive === undefined ? {} : { isActive }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { categories: true, users: true, complaints: true } },
      },
    }),
  ]);

  return { items, meta: getPaginationMeta(page, limit, total) };
}

export async function getActiveDepartmentsCached() {
  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEY).catch(() => null);
      if (cached) {
        return JSON.parse(cached) as unknown;
      }
    }
  }

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      await redis.set(CACHE_KEY, JSON.stringify(departments), 'EX', CACHE_TTL_SECONDS).catch(
        () => undefined,
      );
    }
  }

  return departments;
}

export async function getDepartmentById(id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      categories: { where: { isActive: true }, select: { id: true, name: true } },
      _count: { select: { users: true, complaints: true } },
    },
  });
  if (!department) {
    throw ApiError.notFound('Department not found');
  }
  return department;
}

export async function updateDepartment(
  actorId: string,
  id: string,
  input: DepartmentUpdateInput,
) {
  await getDepartmentById(id);

  const department = await prisma.$transaction(async (tx) => {
    const updated = await tx.department.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description === undefined ? undefined : input.description,
        isActive: input.isActive,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'DEPARTMENT_UPDATED',
        entity: 'Department',
        entityId: id,
        metadata: input,
      },
    });
    return updated;
  });

  await invalidateDepartmentCache();
  return department;
}

export async function deleteDepartment(actorId: string, id: string) {
  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { complaints: true, categories: true } } },
  });

  if (!department) {
    throw ApiError.notFound('Department not found');
  }

  if (department._count.complaints > 0) {
    throw ApiError.conflict(
      'Cannot delete department with existing complaints. Deactivate it instead.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.category.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    await tx.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });
    await tx.department.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'DEPARTMENT_DELETED',
        entity: 'Department',
        entityId: id,
      },
    });
  });

  await invalidateDepartmentCache();
}
