import { z } from 'zod';
import { Role } from '@prisma/client';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(6).max(20).nullable().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
