import { z } from 'zod';

export const createUnitSchema = z.object({
  property_id: z.string().uuid(),
  unit_number: z.string().min(1).max(50),
  base_rent: z.number().positive(),
  size_sqft: z.number().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  maintenance_budget: z.number().min(0),
  maintenance_budget_period: z.enum(['monthly', 'quarterly', 'yearly']),
  notes: z.string().optional(),
});

export const updateUnitSchema = createUnitSchema
  .omit({ property_id: true })
  .extend({
    status: z.enum(['occupied', 'vacant', 'under_maintenance']).optional(),
  })
  .partial();

export type CreateUnitSchema = z.infer<typeof createUnitSchema>;
export type UpdateUnitSchema = z.infer<typeof updateUnitSchema>;
