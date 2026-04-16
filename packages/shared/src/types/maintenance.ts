import type {
  MaintenanceStatus,
  MaintenanceCostStatus,
  MaintenancePriority,
} from '../constants/statuses';

export interface MaintenanceCategory {
  id: string;
  name: string;
  name_ar: string;
  is_active: boolean;
}

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  reported_by: string;
  category_id: string;
  description: string;
  photos: string[];
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  is_duplicate_override: boolean;
  duplicate_override_justification: string | null;
  duplicate_override_by: string | null;
  duplicate_of_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateMaintenanceInput {
  unit_id: string;
  category_id: string;
  description: string;
  priority?: MaintenancePriority;
  photos?: string[];
}

export interface UpdateMaintenanceInput {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  description?: string;
}

export interface OverrideDuplicateInput {
  justification: string;
}

export interface MaintenanceCost {
  id: string;
  maintenance_request_id: string;
  submitted_by: string;
  amount: number;
  description: string;
  receipt_url: string | null;
  status: MaintenanceCostStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMaintenanceCostInput {
  amount: number;
  description: string;
}

export interface RejectMaintenanceCostInput {
  rejection_reason: string;
}
