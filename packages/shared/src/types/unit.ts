import type { UnitStatus, BudgetPeriod } from '../constants/statuses';

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  status: UnitStatus;
  base_rent: number;
  size_sqft: number;
  bedrooms: number;
  bathrooms: number;
  maintenance_budget: number;
  maintenance_budget_period: BudgetPeriod;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateUnitInput {
  property_id: string;
  unit_number: string;
  base_rent: number;
  size_sqft: number;
  bedrooms: number;
  bathrooms: number;
  maintenance_budget: number;
  maintenance_budget_period: BudgetPeriod;
  notes?: string;
}

export interface UpdateUnitInput extends Partial<Omit<CreateUnitInput, 'property_id'>> {
  status?: UnitStatus;
}
