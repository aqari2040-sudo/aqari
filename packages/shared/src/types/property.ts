import type { PropertyType } from '../constants/statuses';

export interface Property {
  id: string;
  name: string;
  name_ar: string;
  type: PropertyType;
  address: string;
  address_ar: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreatePropertyInput {
  name: string;
  name_ar: string;
  type: PropertyType;
  address: string;
  address_ar: string;
}

export interface UpdatePropertyInput extends Partial<CreatePropertyInput> {}
