import { z } from 'zod';
import { ComplaintStatus, Priority } from '@prisma/client';

const locationSchema = z.object({
  address: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(100),
  area: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const complaintCreateSchema = z.object({
  title: z.string().trim().min(5).max(150),
  description: z.string().trim().min(10).max(5000),
  categoryId: z.string().uuid(),
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
  location: locationSchema,
});

export const complaintUpdateSchema = z.object({
  title: z.string().trim().min(5).max(150).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.string().uuid().optional(),
  location: locationSchema.optional(),
});

export const complaintListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  categoryId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const complaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  note: z.string().trim().max(1000).optional(),
});

export const complaintAssignSchema = z.object({
  staffId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const commentCreateSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  isInternal: z.boolean().optional().default(false),
});

export const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;
export type ComplaintUpdateInput = z.infer<typeof complaintUpdateSchema>;
export type ComplaintListQuery = z.infer<typeof complaintListQuerySchema>;
export type ComplaintStatusInput = z.infer<typeof complaintStatusSchema>;
export type ComplaintAssignInput = z.infer<typeof complaintAssignSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
