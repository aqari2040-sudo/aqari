export interface OccupancySummary {
  total_units: number;
  occupied: number;
  vacant: number;
  under_maintenance: number;
  occupancy_rate: number;
  by_property: {
    property_id: string;
    property_name: string;
    total: number;
    occupied: number;
    vacant: number;
    under_maintenance: number;
  }[];
}

export interface PaymentsSummary {
  month: string;
  total_due: number;
  total_collected: number;
  total_overdue: number;
  collection_rate: number;
  overdue_tenants: {
    tenant_id: string;
    tenant_name: string;
    unit_number: string;
    amount_overdue: number;
    days_overdue: number;
  }[];
}

export interface MaintenanceSummary {
  pending_approvals: number;
  total_cost_this_month: number;
  by_category: {
    category_name: string;
    total_cost: number;
    request_count: number;
  }[];
  by_property: {
    property_id: string;
    property_name: string;
    total_cost: number;
    request_count: number;
  }[];
  recurring_alerts: {
    unit_id: string;
    unit_number: string;
    request_count: number;
    period_days: number;
  }[];
}

export interface DashboardAlerts {
  expiring_contracts: {
    contract_id: string;
    tenant_name: string;
    unit_number: string;
    end_date: string;
    days_remaining: number;
  }[];
  suspicious_costs: {
    cost_id: string;
    unit_number: string;
    amount: number;
    unit_average: number;
  }[];
  recurring_maintenance: {
    unit_id: string;
    unit_number: string;
    request_count: number;
  }[];
  budget_warnings: {
    unit_id: string;
    unit_number: string;
    budget: number;
    spent: number;
    percentage: number;
  }[];
}
