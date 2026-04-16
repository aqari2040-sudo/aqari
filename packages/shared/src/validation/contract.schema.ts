import { z } from 'zod';

export const createContractSchema = z
  .object({
    tenant_id: z.string().uuid(),
    unit_id: z.string().uuid(),
    start_date: z.string().date(),
    end_date: z.string().date(),
    rent_amount: z.number().positive(),
    payment_frequency: z.enum(['monthly', 'quarterly', 'yearly']),
    grace_period_days: z.number().int().min(0).default(7),
    notes: z.string().optional(),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

export const updateContractSchema = z.object({
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  rent_amount: z.number().positive().optional(),
  payment_frequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  grace_period_days: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export type CreateContractSchema = z.infer<typeof createContractSchema>;
export type UpdateContractSchema = z.infer<typeof updateContractSchema>;
