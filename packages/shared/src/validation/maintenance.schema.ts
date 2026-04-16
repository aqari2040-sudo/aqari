import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  unit_id: z.string().uuid(),
  category_id: z.string().uuid(),
  description: z.string().min(1).max(2000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const updateMaintenanceSchema = z.object({
  status: z
    .enum([
      'submitted',
      'blocked_duplicate',
      'in_progress',
      'pending_approval',
      'approved',
      'rejected',
      'completed',
    ])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  description: z.string().min(1).max(2000).optional(),
});

export const createMaintenanceCostSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(1000),
});

export const overrideDuplicateSchema = z.object({
  justification: z.string().min(1).max(1000),
});

export const rejectMaintenanceCostSchema = z.object({
  rejection_reason: z.string().min(1).max(1000),
});

export type CreateMaintenanceSchema = z.infer<typeof createMaintenanceSchema>;
export type UpdateMaintenanceSchema = z.infer<typeof updateMaintenanceSchema>;
export type CreateMaintenanceCostSchema = z.infer<typeof createMaintenanceCostSchema>;
export type OverrideDuplicateSchema = z.infer<typeof overrideDuplicateSchema>;
export type RejectMaintenanceCostSchema = z.infer<typeof rejectMaintenanceCostSchema>;
