import {
  ComplaintStatus,
  Prisma,
  Role,
  User,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import { getPaginationMeta, getSkipTake } from '../../utils/pagination';
import { canTransitionStatus } from '../../types';
import {
  CommentCreateInput,
  ComplaintAssignInput,
  ComplaintCreateInput,
  ComplaintListQuery,
  ComplaintStatusInput,
  ComplaintUpdateInput,
  FeedbackInput,
} from './complaint.validation';

const complaintInclude = {
  category: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  location: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
  assignments: {
    where: { isActive: true },
    include: {
      staff: { select: { id: true, fullName: true, email: true } },
    },
  },
  feedback: true,
} satisfies Prisma.ComplaintInclude;

type AuthActor = Pick<User, 'id' | 'role'>;

async function getComplaintOrThrow(id: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: complaintInclude,
  });
  if (!complaint) {
    throw ApiError.notFound('Complaint not found');
  }
  return complaint;
}

async function assertCanView(actor: AuthActor, complaintId: string) {
  const complaint = await getComplaintOrThrow(complaintId);

  if (actor.role === Role.ADMIN) {
    return complaint;
  }

  if (actor.role === Role.CITIZEN) {
    if (complaint.createdById !== actor.id) {
      throw ApiError.forbidden('You can only access your own complaints');
    }
    return complaint;
  }

  // STAFF
  const assigned = complaint.assignments.some((a) => a.staffId === actor.id && a.isActive);
  if (!assigned) {
    throw ApiError.forbidden('You can only access complaints assigned to you');
  }
  return complaint;
}

export async function createComplaint(citizenId: string, input: ComplaintCreateInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category || !category.isActive) {
    throw ApiError.badRequest('Invalid category', [
      { field: 'categoryId', message: 'Active category not found' },
    ]);
  }

  const complaint = await prisma.$transaction(async (tx) => {
    const location = await tx.location.create({ data: input.location });

    const created = await tx.complaint.create({
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        categoryId: input.categoryId,
        departmentId: category.departmentId,
        locationId: location.id,
        createdById: citizenId,
        status: ComplaintStatus.SUBMITTED,
      },
    });

    await tx.complaintStatusHistory.create({
      data: {
        complaintId: created.id,
        fromStatus: null,
        toStatus: ComplaintStatus.SUBMITTED,
        changedById: citizenId,
        note: 'Complaint submitted',
      },
    });

    await tx.notification.create({
      data: {
        userId: citizenId,
        complaintId: created.id,
        title: 'Complaint submitted',
        message: `Your complaint "${created.title}" has been submitted successfully.`,
      },
    });

    return created;
  });

  return getComplaintOrThrow(complaint.id);
}

export async function listComplaints(actor: AuthActor, query: ComplaintListQuery) {
  const { page, limit, search, status, priority, categoryId, departmentId, sortBy, sortOrder } =
    query;
  const { skip, take } = getSkipTake(page, limit);

  const roleFilter: Prisma.ComplaintWhereInput =
    actor.role === Role.ADMIN
      ? {}
      : actor.role === Role.CITIZEN
        ? { createdById: actor.id }
        : {
            assignments: {
              some: { staffId: actor.id, isActive: true },
            },
          };

  const where: Prisma.ComplaintWhereInput = {
    ...roleFilter,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.complaint.count({ where }),
    prisma.complaint.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: complaintInclude,
    }),
  ]);

  return { items, meta: getPaginationMeta(page, limit, total) };
}

export async function getComplaintById(actor: AuthActor, id: string) {
  return assertCanView(actor, id);
}

export async function updateComplaint(
  actor: AuthActor,
  id: string,
  input: ComplaintUpdateInput,
) {
  const complaint = await assertCanView(actor, id);

  if (actor.role === Role.CITIZEN) {
    if (complaint.createdById !== actor.id) {
      throw ApiError.forbidden('You can only update your own complaints');
    }
    if (complaint.status !== ComplaintStatus.SUBMITTED) {
      throw ApiError.badRequest('Citizens can only edit complaints in SUBMITTED status');
    }
  } else if (actor.role === Role.STAFF) {
    throw ApiError.forbidden('Staff cannot edit complaint details. Update status instead.');
  }

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category || !category.isActive) {
      throw ApiError.badRequest('Invalid category');
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.location) {
      await tx.location.update({
        where: { id: complaint.locationId },
        data: input.location,
      });
    }

    let departmentId: string | null | undefined = undefined;
    if (input.categoryId) {
      const category = await tx.category.findUnique({ where: { id: input.categoryId } });
      departmentId = category?.departmentId ?? null;
    }

    return tx.complaint.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        priority: input.priority,
        categoryId: input.categoryId,
        departmentId,
      },
    });
  });

  return getComplaintOrThrow(updated.id);
}

export async function deleteComplaint(actor: AuthActor, id: string) {
  const complaint = await assertCanView(actor, id);

  if (actor.role === Role.CITIZEN) {
    if (complaint.status !== ComplaintStatus.SUBMITTED) {
      throw ApiError.badRequest('Only SUBMITTED complaints can be deleted by citizens');
    }
  } else if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only admin or complaint owner can delete complaints');
  }

  await prisma.$transaction(async (tx) => {
    await tx.complaint.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'COMPLAINT_DELETED',
        entity: 'Complaint',
        entityId: id,
      },
    });
  });
}

export async function updateComplaintStatus(
  actor: AuthActor,
  id: string,
  input: ComplaintStatusInput,
) {
  const complaint = await assertCanView(actor, id);

  if (actor.role === Role.CITIZEN) {
    if (input.status !== ComplaintStatus.CANCELLED) {
      throw ApiError.forbidden('Citizens can only cancel their own complaints');
    }
    if (
      complaint.status !== ComplaintStatus.SUBMITTED &&
      complaint.status !== ComplaintStatus.UNDER_REVIEW
    ) {
      throw ApiError.badRequest('Complaint can no longer be cancelled');
    }
  }

  if (actor.role === Role.STAFF) {
    const allowedForStaff: ComplaintStatus[] = [
      ComplaintStatus.IN_PROGRESS,
      ComplaintStatus.RESOLVED,
    ];
    if (!allowedForStaff.includes(input.status)) {
      throw ApiError.forbidden('Staff can only move complaints to IN_PROGRESS or RESOLVED');
    }
  }

  if (!canTransitionStatus(complaint.status, input.status)) {
    throw ApiError.badRequest(
      `Invalid status transition from ${complaint.status} to ${input.status}`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.update({
      where: { id },
      data: {
        status: input.status,
        resolvedAt:
          input.status === ComplaintStatus.RESOLVED ? new Date() : complaint.resolvedAt,
        closedAt: input.status === ComplaintStatus.CLOSED ? new Date() : complaint.closedAt,
      },
    });

    await tx.complaintStatusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: input.status,
        changedById: actor.id,
        note: input.note,
      },
    });

    await tx.notification.create({
      data: {
        userId: complaint.createdById,
        complaintId: id,
        title: 'Complaint status updated',
        message: `Your complaint status changed to ${input.status}.`,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'COMPLAINT_STATUS_UPDATED',
        entity: 'Complaint',
        entityId: id,
        metadata: { from: complaint.status, to: input.status },
      },
    });

    return result;
  });

  return getComplaintOrThrow(updated.id);
}

export async function assignComplaint(
  actor: AuthActor,
  id: string,
  input: ComplaintAssignInput,
) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.STAFF) {
    throw ApiError.forbidden('Only admin or staff can assign complaints');
  }

  // Staff assignment of others limited — only ADMIN can assign
  if (actor.role !== Role.ADMIN) {
    throw ApiError.forbidden('Only administrators can assign staff to complaints');
  }

  const complaint = await getComplaintOrThrow(id);

  if (
    complaint.status === ComplaintStatus.CLOSED ||
    complaint.status === ComplaintStatus.CANCELLED ||
    complaint.status === ComplaintStatus.REJECTED
  ) {
    throw ApiError.badRequest('Cannot assign a closed, cancelled, or rejected complaint');
  }

  const staff = await prisma.user.findUnique({ where: { id: input.staffId } });
  if (!staff || !staff.isActive) {
    throw ApiError.badRequest('Cannot assign inactive or missing user');
  }
  if (staff.role !== Role.STAFF) {
    throw ApiError.badRequest('Assigned user must have STAFF role');
  }

  const nextStatus =
    complaint.status === ComplaintStatus.SUBMITTED ||
    complaint.status === ComplaintStatus.UNDER_REVIEW
      ? ComplaintStatus.ASSIGNED
      : complaint.status;

  if (
    nextStatus !== complaint.status &&
    !canTransitionStatus(complaint.status, nextStatus)
  ) {
    throw ApiError.badRequest(
      `Invalid status transition from ${complaint.status} to ${nextStatus}`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.complaintAssignment.updateMany({
      where: { complaintId: id, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    await tx.complaintAssignment.create({
      data: {
        complaintId: id,
        staffId: input.staffId,
        assignedById: actor.id,
        notes: input.notes,
        isActive: true,
      },
    });

    await tx.complaint.update({
      where: { id },
      data: {
        status: nextStatus,
        departmentId: input.departmentId ?? staff.departmentId ?? complaint.departmentId,
      },
    });

    if (nextStatus !== complaint.status) {
      await tx.complaintStatusHistory.create({
        data: {
          complaintId: id,
          fromStatus: complaint.status,
          toStatus: nextStatus,
          changedById: actor.id,
          note: input.notes || 'Staff assigned',
        },
      });
    }

    await tx.notification.createMany({
      data: [
        {
          userId: input.staffId,
          complaintId: id,
          title: 'New complaint assignment',
          message: `You have been assigned to complaint "${complaint.title}".`,
        },
        {
          userId: complaint.createdById,
          complaintId: id,
          title: 'Complaint assigned',
          message: 'A staff member has been assigned to your complaint.',
        },
      ],
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'COMPLAINT_ASSIGNED',
        entity: 'Complaint',
        entityId: id,
        metadata: { staffId: input.staffId },
      },
    });
  });

  return getComplaintOrThrow(id);
}

export async function getComplaintHistory(actor: AuthActor, id: string) {
  await assertCanView(actor, id);
  return prisma.complaintStatusHistory.findMany({
    where: { complaintId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      changedBy: { select: { id: true, fullName: true, role: true } },
    },
  });
}

export async function addComment(actor: AuthActor, id: string, input: CommentCreateInput) {
  const complaint = await assertCanView(actor, id);

  if (actor.role === Role.CITIZEN && input.isInternal) {
    throw ApiError.forbidden('Citizens cannot create internal comments');
  }

  if (
    (complaint.status === ComplaintStatus.CLOSED ||
      complaint.status === ComplaintStatus.CANCELLED) &&
    actor.role === Role.CITIZEN
  ) {
    throw ApiError.badRequest('Cannot comment on closed or cancelled complaints');
  }

  return prisma.comment.create({
    data: {
      complaintId: id,
      authorId: actor.id,
      content: input.content,
      isInternal: actor.role === Role.CITIZEN ? false : input.isInternal,
    },
    include: {
      author: { select: { id: true, fullName: true, role: true } },
    },
  });
}

export async function listComments(actor: AuthActor, id: string) {
  await assertCanView(actor, id);

  return prisma.comment.findMany({
    where: {
      complaintId: id,
      ...(actor.role === Role.CITIZEN ? { isInternal: false } : {}),
    },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, fullName: true, role: true } },
    },
  });
}

export async function submitFeedback(actor: AuthActor, id: string, input: FeedbackInput) {
  if (actor.role !== Role.CITIZEN) {
    throw ApiError.forbidden('Only citizens can submit feedback');
  }

  const complaint = await assertCanView(actor, id);

  if (complaint.createdById !== actor.id) {
    throw ApiError.forbidden('You can only feedback your own complaints');
  }

  if (complaint.status !== ComplaintStatus.RESOLVED && complaint.status !== ComplaintStatus.CLOSED) {
    throw ApiError.badRequest('Feedback is only allowed after the complaint is RESOLVED');
  }

  const existing = await prisma.feedback.findUnique({ where: { complaintId: id } });
  if (existing) {
    throw ApiError.conflict('Feedback already submitted for this complaint');
  }

  return prisma.$transaction(async (tx) => {
    const feedback = await tx.feedback.create({
      data: {
        complaintId: id,
        citizenId: actor.id,
        rating: input.rating,
        comment: input.comment,
      },
    });

    if (complaint.status === ComplaintStatus.RESOLVED) {
      await tx.complaint.update({
        where: { id },
        data: { status: ComplaintStatus.CLOSED, closedAt: new Date() },
      });
      await tx.complaintStatusHistory.create({
        data: {
          complaintId: id,
          fromStatus: ComplaintStatus.RESOLVED,
          toStatus: ComplaintStatus.CLOSED,
          changedById: actor.id,
          note: 'Closed after citizen feedback',
        },
      });
    }

    return feedback;
  });
}

export async function getFeedback(actor: AuthActor, id: string) {
  await assertCanView(actor, id);
  const feedback = await prisma.feedback.findUnique({
    where: { complaintId: id },
    include: {
      citizen: { select: { id: true, fullName: true } },
    },
  });
  if (!feedback) {
    throw ApiError.notFound('Feedback not found');
  }
  return feedback;
}
