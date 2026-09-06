import { z } from 'zod';

export const createPaymentSessionSchema = z.object({
  complaintId: z.string().uuid().optional(),
  amount: z.number().int().positive().max(1_000_000),
  currency: z.string().trim().length(3).default('usd'),
  description: z.string().trim().max(255).optional(),
});

export type CreatePaymentSessionInput = z.infer<typeof createPaymentSessionSchema>;
