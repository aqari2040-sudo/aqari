import { z } from 'zod';

export const confirmPaymentSchema = z.object({
  confirmed_amount: z.number().positive(),
  confirmed_date: z.string().date(),
});

export const rejectPaymentSchema = z.object({
  rejection_reason: z.string().min(1).max(1000),
});

export type ConfirmPaymentSchema = z.infer<typeof confirmPaymentSchema>;
export type RejectPaymentSchema = z.infer<typeof rejectPaymentSchema>;
