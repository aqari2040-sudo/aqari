export const UNIT_STATUS = {
  OCCUPIED: 'occupied',
  VACANT: 'vacant',
  UNDER_MAINTENANCE: 'under_maintenance',
} as const;

export type UnitStatus = (typeof UNIT_STATUS)[keyof typeof UNIT_STATUS];

export const CONTRACT_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
} as const;

export type ContractStatus = (typeof CONTRACT_STATUS)[keyof typeof CONTRACT_STATUS];

export const PAYMENT_SCHEDULE_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export type PaymentScheduleStatus =
  (typeof PAYMENT_SCHEDULE_STATUS)[keyof typeof PAYMENT_SCHEDULE_STATUS];

export const PAYMENT_STATUS = {
  PENDING_REVIEW: 'pending_review',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const MAINTENANCE_STATUS = {
  SUBMITTED: 'submitted',
  BLOCKED_DUPLICATE: 'blocked_duplicate',
  IN_PROGRESS: 'in_progress',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];

export const MAINTENANCE_COST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type MaintenanceCostStatus =
  (typeof MAINTENANCE_COST_STATUS)[keyof typeof MAINTENANCE_COST_STATUS];

export const MAINTENANCE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type MaintenancePriority =
  (typeof MAINTENANCE_PRIORITY)[keyof typeof MAINTENANCE_PRIORITY];

export const PAYMENT_FREQUENCY = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

export type PaymentFrequency = (typeof PAYMENT_FREQUENCY)[keyof typeof PAYMENT_FREQUENCY];

export const PROPERTY_TYPE = {
  TOWER: 'tower',
  HOUSE_GROUP: 'house_group',
} as const;

export type PropertyType = (typeof PROPERTY_TYPE)[keyof typeof PROPERTY_TYPE];

export const ID_TYPE = {
  EMIRATES_ID: 'emirates_id',
  PASSPORT: 'passport',
} as const;

export type IdType = (typeof ID_TYPE)[keyof typeof ID_TYPE];

export const AUDIT_ACTION = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const BUDGET_PERIOD = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

export type BudgetPeriod = (typeof BUDGET_PERIOD)[keyof typeof BUDGET_PERIOD];
