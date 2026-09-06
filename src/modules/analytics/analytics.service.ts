import { ComplaintStatus, PaymentStatus, Priority, Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { cacheGet, cacheSet } from '../../lib/redis';

const OVERVIEW_CACHE_KEY = 'cache:analytics:overview';
const CACHE_TTL_SECONDS = 60;

export async function getOverview() {
  const cached = await cacheGet<Record<string, unknown>>(OVERVIEW_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const [
    totalComplaints,
    openComplaints,
    resolvedComplaints,
    closedComplaints,
    totalUsers,
    totalStaff,
    totalCitizens,
    paidPayments,
    pendingPayments,
  ] = await Promise.all([
    prisma.complaint.count(),
    prisma.complaint.count({
      where: {
        status: {
          in: [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.UNDER_REVIEW,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.IN_PROGRESS,
          ],
        },
      },
    }),
    prisma.complaint.count({ where: { status: ComplaintStatus.RESOLVED } }),
    prisma.complaint.count({ where: { status: ComplaintStatus.CLOSED } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.STAFF } }),
    prisma.user.count({ where: { role: Role.CITIZEN } }),
    prisma.payment.count({ where: { status: PaymentStatus.PAID } }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING } }),
  ]);

  const data = {
    complaints: {
      total: totalComplaints,
      open: openComplaints,
      resolved: resolvedComplaints,
      closed: closedComplaints,
    },
    users: {
      total: totalUsers,
      staff: totalStaff,
      citizens: totalCitizens,
    },
    payments: {
      paid: paidPayments,
      pending: pendingPayments,
    },
  };

  await cacheSet(OVERVIEW_CACHE_KEY, data, CACHE_TTL_SECONDS);
  return data;
}

export async function getComplaintAnalytics() {
  const [byStatus, byPriority, byCategory, recent] = await Promise.all([
    prisma.complaint.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by: ['priority'],
      _count: { _all: true },
    }),
    prisma.complaint.groupBy({
      by: ['categoryId'],
      _count: { _all: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 10,
    }),
    prisma.complaint.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    }),
  ]);

  const categoryIds = byCategory.map((c) => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return {
    byStatus: byStatus.map((row) => ({
      status: row.status as ComplaintStatus,
      count: row._count._all,
    })),
    byPriority: byPriority.map((row) => ({
      priority: row.priority as Priority,
      count: row._count._all,
    })),
    byCategory: byCategory.map((row) => ({
      categoryId: row.categoryId,
      categoryName: categoryMap.get(row.categoryId) || 'Unknown',
      count: row._count._all,
    })),
    recent,
  };
}
