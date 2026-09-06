import { describe, expect, it } from 'vitest';
import { ComplaintStatus } from '@prisma/client';
import { canTransitionStatus, COMPLAINT_TRANSITIONS } from '../src/types';
import { registerSchema, loginSchema } from '../src/modules/auth/auth.validation';
import { complaintCreateSchema, feedbackSchema } from '../src/modules/complaint/complaint.validation';

describe('complaint status transitions', () => {
  it('allows SUBMITTED -> UNDER_REVIEW', () => {
    expect(canTransitionStatus(ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW)).toBe(
      true,
    );
  });

  it('rejects SUBMITTED -> RESOLVED', () => {
    expect(canTransitionStatus(ComplaintStatus.SUBMITTED, ComplaintStatus.RESOLVED)).toBe(false);
  });

  it('allows RESOLVED -> CLOSED only', () => {
    expect(COMPLAINT_TRANSITIONS[ComplaintStatus.RESOLVED]).toEqual([ComplaintStatus.CLOSED]);
  });

  it('has no transitions from CLOSED', () => {
    expect(COMPLAINT_TRANSITIONS[ComplaintStatus.CLOSED]).toEqual([]);
  });
});

describe('auth validation', () => {
  it('accepts valid register payload', () => {
    const parsed = registerSchema.safeParse({
      email: 'citizen@example.com',
      password: 'Citizen@12345',
      fullName: 'Test Citizen',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects weak password', () => {
    const parsed = registerSchema.safeParse({
      email: 'citizen@example.com',
      password: 'weak',
      fullName: 'Test Citizen',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid login email', () => {
    const parsed = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'x',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('complaint validation', () => {
  it('requires location and category', () => {
    const parsed = complaintCreateSchema.safeParse({
      title: 'Short',
      description: 'Too short',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid complaint payload', () => {
    const parsed = complaintCreateSchema.safeParse({
      title: 'Broken street light near park',
      description: 'The street light has been out for one week causing safety issues.',
      categoryId: '11111111-1111-4111-8111-111111111111',
      location: {
        address: '12 Main Street',
        city: 'Dhaka',
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid feedback rating', () => {
    const parsed = feedbackSchema.safeParse({ rating: 6 });
    expect(parsed.success).toBe(false);
  });
});
