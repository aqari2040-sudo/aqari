import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().min(1).max(255),
  name_ar: z.string().min(1).max(255),
  type: z.enum(['tower', 'house_group']),
  address: z.string().min(1),
  address_ar: z.string().min(1),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertySchema = z.infer<typeof createPropertySchema>;
export type UpdatePropertySchema = z.infer<typeof updatePropertySchema>;
