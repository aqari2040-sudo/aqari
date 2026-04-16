export const DEFAULT_SETTINGS = {
  duplicate_maintenance_window_days: 30,
  ocr_confidence_threshold: 0.5,
  default_grace_period_days: 7,
  recurring_maintenance_threshold: 3,
  recurring_maintenance_window_days: 90,
  suspicious_cost_multiplier: 2.0,
  max_file_size_mb: 5,
} as const;

export const MAINTENANCE_CATEGORIES = [
  { name: 'Plumbing', name_ar: 'سباكة' },
  { name: 'Electrical', name_ar: 'كهرباء' },
  { name: 'HVAC', name_ar: 'تكييف' },
  { name: 'Structural', name_ar: 'هيكلي' },
  { name: 'Painting', name_ar: 'دهان' },
  { name: 'Pest Control', name_ar: 'مكافحة حشرات' },
  { name: 'Appliance', name_ar: 'أجهزة' },
  { name: 'Other', name_ar: 'أخرى' },
] as const;

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const NOTIFICATION_TYPES = {
  OVERDUE_RENT: 'overdue_rent',
  CONTRACT_EXPIRY: 'contract_expiry',
  MAINTENANCE_UPDATE: 'maintenance_update',
  COST_PENDING: 'cost_pending',
  COST_APPROVED: 'cost_approved',
  COST_REJECTED: 'cost_rejected',
  RECEIPT_CONFIRMED: 'receipt_confirmed',
  RECEIPT_REJECTED: 'receipt_rejected',
  SUSPICIOUS_COST: 'suspicious_cost',
  RECURRING_MAINTENANCE: 'recurring_maintenance',
  BUDGET_EXCEEDED: 'budget_exceeded',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
