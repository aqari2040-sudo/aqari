import { z } from 'zod';

const uaePhoneRegex = /^\+971[0-9]{8,9}$/;

export const createTenantSchema = z.object({
  full_name: z.string().min(1).max(255),
  full_name_ar: z.string().min(1).max(255),
  id_type: z.enum(['emirates_id', 'passport']),
  id_number: z.string().min(1).max(50),
  phone: z.string().regex(uaePhoneRegex, 'Invalid UAE phone number (e.g. +971501234567)'),
  email: z.string().email().optional(),
  emergency_contact_name: z.string().max(255).optional(),
  emergency_contact_phone: z.string().regex(uaePhoneRegex).optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantSchema = z.infer<typeof createTenantSchema>;
export type UpdateTenantSchema = z.infer<typeof updateTenantSchema>;
