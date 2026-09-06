import { Role, ComplaintStatus, Priority, PaymentStatus } from '@prisma/client';

export type { Role, ComplaintStatus, Priority, PaymentStatus };

export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['ASSIGNED', 'REJECTED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransitionStatus(from: ComplaintStatus, to: ComplaintStatus): boolean {
  return COMPLAINT_TRANSITIONS[from].includes(to);
}
