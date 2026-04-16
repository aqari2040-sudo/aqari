import type { PaymentScheduleStatus, PaymentStatus } from '../constants/statuses';

export interface PaymentSchedule {
  id: string;
  contract_id: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: PaymentScheduleStatus;
  overdue_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  payment_schedule_id: string;
  tenant_id: string;
  unit_id: string;
  amount: number;
  payment_date: string;
  receipt_file_url: string;
  ocr_extracted_amount: number | null;
  ocr_extracted_date: string | null;
  ocr_confidence: number | null;
  ocr_flagged: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  status: PaymentStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ConfirmPaymentInput {
  confirmed_amount: number;
  confirmed_date: string;
}

export interface RejectPaymentInput {
  rejection_reason: string;
}
