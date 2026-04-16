import type { ContractStatus, PaymentFrequency } from '../constants/statuses';

export interface Contract {
  id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_frequency: PaymentFrequency;
  grace_period_days: number;
  document_url: string | null;
  status: ContractStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateContractInput {
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_frequency: PaymentFrequency;
  grace_period_days?: number;
  notes?: string;
}

export interface UpdateContractInput extends Partial<Omit<CreateContractInput, 'tenant_id' | 'unit_id'>> {}
