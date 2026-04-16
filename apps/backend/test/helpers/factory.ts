// ─── Property ────────────────────────────────────────────────────────────────

export function createMockProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prop-uuid-1',
    name: 'Al Noor Tower',
    name_ar: 'برج النور',
    type: 'tower',
    address: 'Dubai, UAE',
    address_ar: 'دبي، الإمارات',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    deleted_at: null,
    ...overrides,
  };
}

// ─── Unit ────────────────────────────────────────────────────────────────────

export function createMockUnit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'unit-uuid-1',
    property_id: 'prop-uuid-1',
    unit_number: '101',
    floor: 1,
    bedrooms: 2,
    bathrooms: 2,
    area_sqft: 1200,
    status: 'vacant',
    rent_amount: 5000,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    deleted_at: null,
    ...overrides,
  };
}

// ─── Tenant ──────────────────────────────────────────────────────────────────

export function createMockTenant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tenant-uuid-1',
    user_id: 'user-uuid-1',
    full_name: 'Ahmed Al Mansouri',
    full_name_ar: 'أحمد المنصوري',
    email: 'ahmed@example.com',
    phone: '+971501234567',
    id_number: 'UAE-123456',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    deleted_at: null,
    ...overrides,
  };
}

// ─── Contract ────────────────────────────────────────────────────────────────

export function createMockContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'contract-uuid-1',
    tenant_id: 'tenant-uuid-1',
    unit_id: 'unit-uuid-1',
    start_date: new Date('2024-01-01T00:00:00.000Z'),
    end_date: new Date('2024-12-31T00:00:00.000Z'),
    rent_amount: 5000,
    payment_frequency: 'monthly',
    grace_period_days: 7,
    status: 'active',
    document_url: null,
    notes: null,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    deleted_at: null,
    ...overrides,
  };
}

// ─── PaymentSchedule ─────────────────────────────────────────────────────────

export function createMockPaymentSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'schedule-uuid-1',
    contract_id: 'contract-uuid-1',
    due_date: new Date('2024-01-01T00:00:00.000Z'),
    amount_due: 5000,
    amount_paid: 0,
    status: 'pending',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export function createMockPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'payment-uuid-1',
    payment_schedule_id: 'schedule-uuid-1',
    tenant_id: 'tenant-uuid-1',
    unit_id: 'unit-uuid-1',
    amount: 5000,
    payment_date: new Date('2024-01-15T00:00:00.000Z'),
    receipt_file_url: 'https://example.com/receipt.jpg',
    ocr_extracted_amount: null,
    ocr_extracted_date: null,
    ocr_confidence: 0,
    ocr_flagged: true,
    status: 'pending_review',
    confirmed_by: null,
    confirmed_at: null,
    rejection_reason: null,
    created_at: new Date('2024-01-15T00:00:00.000Z'),
    updated_at: new Date('2024-01-15T00:00:00.000Z'),
    deleted_at: null,
    ...overrides,
  };
}

// ─── MaintenanceRequest ───────────────────────────────────────────────────────

export function createMockMaintenanceRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'maint-uuid-1',
    unit_id: 'unit-uuid-1',
    reported_by: 'user-uuid-1',
    category_id: 'cat-uuid-1',
    description: 'Air conditioner not cooling properly',
    photos: [],
    priority: 'medium',
    status: 'submitted',
    duplicate_of_id: null,
    is_duplicate_override: false,
    duplicate_override_justification: null,
    duplicate_override_by: null,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    deleted_at: null,
    ...overrides,
  };
}

// ─── MaintenanceCategory ─────────────────────────────────────────────────────

export function createMockMaintenanceCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cat-uuid-1',
    name: 'HVAC',
    name_ar: 'تكييف',
    is_active: true,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ─── MaintenanceCost ──────────────────────────────────────────────────────────

export function createMockMaintenanceCost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cost-uuid-1',
    maintenance_request_id: 'maint-uuid-1',
    description: 'AC unit replacement',
    amount: 1500,
    invoice_url: null,
    status: 'pending',
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    updated_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

// ─── AuthUser ─────────────────────────────────────────────────────────────────

export function createMockAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-1',
    email: 'admin@aqari.ae',
    role: 'admin',
    tenant_id: null,
    ...overrides,
  };
}
