import type { IdType } from '../constants/statuses';

export interface Tenant {
  id: string;
  user_id: string;
  full_name: string;
  full_name_ar: string;
  id_type: IdType;
  id_number: string;
  phone: string;
  email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateTenantInput {
  full_name: string;
  full_name_ar: string;
  id_type: IdType;
  id_number: string;
  phone: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface UpdateTenantInput extends Partial<CreateTenantInput> {}
