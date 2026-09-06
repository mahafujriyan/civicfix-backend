import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/api-error';
import * as complaintService from '../complaint/complaint.service';
import { ComplaintAssignInput } from '../complaint/complaint.validation';

export async function assignStaffToComplaint(
  actor: { id: string; role: Role },
  complaintId: string,
  input: ComplaintAssignInput,
) {
  return complaintService.assignComplaint(actor, complaintId, input);
}

export async function listAssignableStaff() {
  return prisma.user.findMany({
    where: { role: Role.STAFF, isActive: true },
    select: {
      id: true,
      fullName: true,
      email: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { fullName: 'asc' },
  });
}

export async function assertStaffAssignable(staffId: string) {
  const staff = await prisma.user.findUnique({ where: { id: staffId } });
  if (!staff || !staff.isActive) {
    throw ApiError.badRequest('Cannot assign inactive or missing user');
  }
  if (staff.role !== Role.STAFF) {
    throw ApiError.badRequest('Assigned user must have STAFF role');
  }
  return staff;
}
