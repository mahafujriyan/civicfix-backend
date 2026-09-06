import { prisma } from '../../lib/prisma';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { ApiError } from '../../utils/api-error';
import { getPaginationMeta, getSkipTake } from '../../utils/pagination';
import {
  CategoryCreateInput,
  CategoryListQuery,
  CategoryUpdateInput,
} from './category.validation';

const CACHE_KEY = 'cache:categories:active';
const CACHE_TTL_SECONDS = 300;

async function invalidateCategoryCache() {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  if (redis) {
    await redis.del(CACHE_KEY).catch(() => undefined);
  }
}

async function assertDepartmentExists(departmentId?: string | null) {
  if (!departmentId) return;
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) {
    throw ApiError.badRequest('Invalid departmentId', [
      { field: 'departmentId', message: 'Department not found' },
    ]);
  }
}

export async function createCategory(actorId: string, input: CategoryCreateInput) {
  await assertDepartmentExists(input.departmentId);

  const category = await prisma.$transaction(async (tx) => {
    const created = await tx.category.create({ data: input });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'CATEGORY_CREATED',
        entity: 'Category',
        entityId: created.id,
      },
    });
    return created;
  });

  await invalidateCategoryCache();
  return category;
}

export async function listCategories(query: CategoryListQuery) {
  const { page, limit, search, departmentId, sortBy, sortOrder, isActive } = query;
  const { skip, take } = getSkipTake(page, limit);

  const where = {
    ...(departmentId ? { departmentId } : {}),
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
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { complaints: true } },
      },
    }),
  ]);

  return { items, meta: getPaginationMeta(page, limit, total) };
}

export async function getActiveCategoriesCached() {
  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEY).catch(() => null);
      if (cached) {
        return JSON.parse(cached) as unknown;
      }
    }
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: { department: { select: { id: true, name: true } } },
  });

  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      await redis.set(CACHE_KEY, JSON.stringify(categories), 'EX', CACHE_TTL_SECONDS).catch(
        () => undefined,
      );
    }
  }

  return categories;
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { complaints: true } },
    },
  });
  if (!category) {
    throw ApiError.notFound('Category not found');
  }
  return category;
}

export async function updateCategory(actorId: string, id: string, input: CategoryUpdateInput) {
  await getCategoryById(id);
  await assertDepartmentExists(input.departmentId);

  const category = await prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description === undefined ? undefined : input.description,
        departmentId: input.departmentId === undefined ? undefined : input.departmentId,
        isActive: input.isActive,
      },
      include: { department: { select: { id: true, name: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'CATEGORY_UPDATED',
        entity: 'Category',
        entityId: id,
        metadata: input,
      },
    });
    return updated;
  });

  await invalidateCategoryCache();
  return category;
}

export async function deleteCategory(actorId: string, id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { complaints: true } } },
  });

  if (!category) {
    throw ApiError.notFound('Category not found');
  }

  if (category._count.complaints > 0) {
    throw ApiError.conflict(
      'Cannot delete category referenced by complaints. Deactivate it instead.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.category.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: 'CATEGORY_DELETED',
        entity: 'Category',
        entityId: id,
      },
    });
  });

  await invalidateCategoryCache();
}
