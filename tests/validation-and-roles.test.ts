import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { createPaymentSessionSchema } from '../src/modules/payment/payment.validation';
import { departmentCreateSchema } from '../src/modules/department/department.validation';
import { complaintStatusSchema, complaintAssignSchema } from '../src/modules/complaint/complaint.validation';
import { canTransitionStatus } from '../src/types';
import { ComplaintStatus } from '@prisma/client';

describe('payment validation', () => {
  it('accepts valid checkout payload', () => {
    const parsed = createPaymentSessionSchema.safeParse({
      amount: 500,
      currency: 'usd',
      description: 'Service fee',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const parsed = createPaymentSessionSchema.safeParse({ amount: 0 });
    expect(parsed.success).toBe(false);
  });
});

describe('department validation', () => {
  it('requires name', () => {
    const parsed = departmentCreateSchema.safeParse({ description: 'x' });
    expect(parsed.success).toBe(false);
  });
});

describe('workflow validation', () => {
  it('accepts valid status payload', () => {
    const parsed = complaintStatusSchema.safeParse({
      status: ComplaintStatus.UNDER_REVIEW,
      note: 'ok',
    });
    expect(parsed.success).toBe(true);
  });

  it('requires staffId for assignment', () => {
    const parsed = complaintAssignSchema.safeParse({ notes: 'assign' });
    expect(parsed.success).toBe(false);
  });
});

describe('authorization role set', () => {
  it('exposes exactly three application roles', () => {
    expect(Object.keys(Role).sort()).toEqual(['ADMIN', 'CITIZEN', 'STAFF']);
  });
});

describe('invalid status jumps', () => {
  it('blocks ASSIGNED -> CLOSED', () => {
    expect(canTransitionStatus(ComplaintStatus.ASSIGNED, ComplaintStatus.CLOSED)).toBe(false);
  });

  it('allows ASSIGNED -> IN_PROGRESS', () => {
    expect(canTransitionStatus(ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS)).toBe(true);
  });
});
