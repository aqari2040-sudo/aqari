import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();
const supabase = createClient(
  'https://llnoeepwmkqysdglqoby.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbm9lZXB3bWtxeXNkZ2xxb2J5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM1ODQzNywiZXhwIjoyMDkxOTM0NDM3fQ.zeyQkbWRgHKEuR7ztwJreDg7rdVl8iHpNS1gK5sZd38',
);

const OWNER_ID = '014ef3d4-0c29-48ad-a4b4-b1c19a1378dc';

async function main() {
  console.log('Seeding demo data...\n');

  // Properties
  const tower = await prisma.property.create({
    data: { name: 'Al Noor Tower', name_ar: 'برج النور', type: 'tower', address: 'Sheikh Zayed Road, Dubai', address_ar: 'شارع الشيخ زايد، دبي' },
  });
  const villas = await prisma.property.create({
    data: { name: 'Palm Villas', name_ar: 'فلل النخيل', type: 'house_group', address: 'JVC, Dubai', address_ar: 'قرية جميرا الدائرية، دبي' },
  });
  console.log('Created 2 properties');

  // Units
  const units: any[] = [];
  const towerData = [
    { num: 'A-101', status: 'occupied' as const, rent: 4500, sqft: 750, bed: 1, bath: 1 },
    { num: 'A-102', status: 'occupied' as const, rent: 4500, sqft: 750, bed: 1, bath: 1 },
    { num: 'A-201', status: 'occupied' as const, rent: 5000, sqft: 850, bed: 2, bath: 1 },
    { num: 'A-202', status: 'occupied' as const, rent: 5000, sqft: 850, bed: 2, bath: 1 },
    { num: 'A-301', status: 'occupied' as const, rent: 5500, sqft: 950, bed: 2, bath: 2 },
    { num: 'A-302', status: 'vacant' as const, rent: 5500, sqft: 950, bed: 2, bath: 2 },
    { num: 'A-401', status: 'vacant' as const, rent: 6000, sqft: 1050, bed: 3, bath: 2 },
    { num: 'A-402', status: 'under_maintenance' as const, rent: 6000, sqft: 1050, bed: 3, bath: 2 },
  ];
  for (const u of towerData) {
    const unit = await prisma.unit.create({
      data: { property_id: tower.id, unit_number: u.num, status: u.status, base_rent: u.rent, size_sqft: u.sqft, bedrooms: u.bed, bathrooms: u.bath, maintenance_budget: 5000, maintenance_budget_period: 'quarterly' },
    });
    units.push(unit);
  }
  const villaData = [
    { num: 'Villa-1', status: 'occupied' as const, rent: 9000 },
    { num: 'Villa-2', status: 'occupied' as const, rent: 10000 },
    { num: 'Villa-3', status: 'occupied' as const, rent: 11000 },
    { num: 'Villa-4', status: 'vacant' as const, rent: 12000 },
  ];
  for (const v of villaData) {
    const unit = await prisma.unit.create({
      data: { property_id: villas.id, unit_number: v.num, status: v.status, base_rent: v.rent, size_sqft: 2000, bedrooms: 3, bathrooms: 3, maintenance_budget: 8000, maintenance_budget_period: 'quarterly' },
    });
    units.push(unit);
  }
  console.log('Created', units.length, 'units');

  // Tenants
  const tenantInfos = [
    { name: 'Ahmed Al Mansouri', ar: 'أحمد المنصوري', phone: '+971501234567', email: 'ahmed@test.com', id: '784-1990-1234567-1' },
    { name: 'Fatima Hassan', ar: 'فاطمة حسن', phone: '+971502345678', email: 'fatima@test.com', id: '784-1985-2345678-2' },
    { name: 'Mohammed Ali', ar: 'محمد علي', phone: '+971503456789', email: 'mohammed@test.com', id: '784-1992-3456789-3' },
    { name: 'Sara Al Blooshi', ar: 'سارة البلوشي', phone: '+971504567890', email: 'sara@test.com', id: '784-1988-4567890-4' },
    { name: 'Khalid Rahman', ar: 'خالد رحمن', phone: '+971505678901', email: 'khalid@test.com', id: '784-1995-5678901-5' },
    { name: 'Noor Al Ameri', ar: 'نور العامري', phone: '+971506789012', email: 'noor@test.com', id: '784-1993-6789012-6' },
    { name: 'Yusuf Ibrahim', ar: 'يوسف إبراهيم', phone: '+971507890123', email: 'yusuf@test.com', id: '784-1991-7890123-7' },
    { name: 'Layla Al Hashmi', ar: 'ليلى الهاشمي', phone: '+971508901234', email: 'layla@test.com', id: '784-1987-8901234-8' },
  ];

  const tenants: any[] = [];
  for (const t of tenantInfos) {
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: t.email, password: 'Tenant@2026!', email_confirm: true,
      user_metadata: { role: 'tenant', full_name: t.name },
    });
    if (!authUser?.user) { console.log('Failed to create auth user for', t.email); continue; }
    const tenant = await prisma.tenant.create({
      data: { user_id: authUser.user.id, full_name: t.name, full_name_ar: t.ar, id_type: 'emirates_id', id_number: t.id, phone: t.phone, email: t.email, emergency_contact_name: 'Emergency', emergency_contact_phone: '+971509999999' },
    });
    tenants.push(tenant);
  }
  console.log('Created', tenants.length, 'tenants');

  // Employee
  await supabase.auth.admin.createUser({
    email: 'employee@aqari.com', password: 'Employee@2026!', email_confirm: true,
    user_metadata: { role: 'employee', full_name: 'Rashid Employee' },
  });
  console.log('Created employee account');

  // Contracts + Payment Schedules
  const occupiedUnits = units.filter((u) => u.status === 'occupied');
  const contracts: any[] = [];
  for (let i = 0; i < occupiedUnits.length && i < tenants.length; i++) {
    const contract = await prisma.contract.create({
      data: { tenant_id: tenants[i].id, unit_id: occupiedUnits[i].id, start_date: new Date('2026-01-01'), end_date: new Date('2026-12-31'), rent_amount: occupiedUnits[i].base_rent, payment_frequency: 'monthly', grace_period_days: 7, status: 'active' },
    });
    contracts.push(contract);

    // Generate payment schedules
    for (let month = 0; month < 12; month++) {
      const dueDate = new Date(2026, month, 1);
      const isPaid = month < 3; // Jan-Mar paid
      const isOverdue = month === 3 && i < 3; // April overdue for first 3
      await prisma.paymentSchedule.create({
        data: {
          contract_id: contract.id, due_date: dueDate, amount_due: occupiedUnits[i].base_rent,
          amount_paid: isPaid ? occupiedUnits[i].base_rent : 0,
          status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
          overdue_since: isOverdue ? new Date('2026-04-08') : null,
        },
      });
    }
  }
  console.log('Created', contracts.length, 'contracts with payment schedules');

  // Maintenance Requests
  const categories = await prisma.maintenanceCategory.findMany();
  const catMap: Record<string, string> = {};
  for (const c of categories) catMap[c.name] = c.id;

  const maintData = [
    { unit: 0, cat: 'Plumbing', desc: 'Kitchen sink leaking, water damage on cabinet below', priority: 'high' as const, status: 'completed' as const },
    { unit: 1, cat: 'Electrical', desc: 'Bedroom light switches sparking when toggled', priority: 'urgent' as const, status: 'in_progress' as const },
    { unit: 2, cat: 'HVAC', desc: 'AC not cooling, making loud rattling noise', priority: 'medium' as const, status: 'submitted' as const },
    { unit: 3, cat: 'Painting', desc: 'Living room wall paint peeling and cracking', priority: 'low' as const, status: 'completed' as const },
    { unit: 8, cat: 'Plumbing', desc: 'Villa bathroom shower drain completely blocked', priority: 'medium' as const, status: 'pending_approval' as const },
    { unit: 9, cat: 'Electrical', desc: 'Kitchen power outlets not working, circuit issue', priority: 'high' as const, status: 'submitted' as const },
    { unit: 0, cat: 'Plumbing', desc: 'Bathroom faucet dripping constantly, wasting water', priority: 'medium' as const, status: 'submitted' as const },
    { unit: 4, cat: 'HVAC', desc: 'AC thermostat not responding, unit runs non-stop', priority: 'high' as const, status: 'in_progress' as const },
  ];

  const requests: any[] = [];
  for (const m of maintData) {
    const req = await prisma.maintenanceRequest.create({
      data: { unit_id: units[m.unit].id, reported_by: OWNER_ID, category_id: catMap[m.cat], description: m.desc, photos: [], priority: m.priority, status: m.status },
    });
    requests.push(req);
  }
  console.log('Created', requests.length, 'maintenance requests');

  // Maintenance Costs
  const costs = [
    { req: 0, amount: 800, desc: 'Plumber visit + pipe replacement', status: 'approved' as const },
    { req: 0, amount: 350, desc: 'Cabinet repair after water damage', status: 'approved' as const },
    { req: 1, amount: 1200, desc: 'Electrician - full bedroom rewiring', status: 'pending' as const },
    { req: 3, amount: 2500, desc: 'Full repaint of living room + hallway', status: 'approved' as const },
    { req: 4, amount: 450, desc: 'Drain cleaning and pipe inspection', status: 'pending' as const },
    { req: 7, amount: 3500, desc: 'AC compressor replacement', status: 'pending' as const },
  ];
  for (const c of costs) {
    await prisma.maintenanceCost.create({
      data: { maintenance_request_id: requests[c.req].id, submitted_by: OWNER_ID, amount: c.amount, description: c.desc, status: c.status, approved_by: c.status === 'approved' ? OWNER_ID : null, approved_at: c.status === 'approved' ? new Date() : null },
    });
  }
  console.log('Created', costs.length, 'maintenance costs');

  // Notifications
  const notifs = [
    { type: 'overdue_rent', title: 'Overdue Payment Alert', title_ar: 'تنبيه دفعة متأخرة', body: '3 tenants have overdue payments totaling AED 14,500', body_ar: '3 مستأجرين لديهم دفعات متأخرة بإجمالي 14,500 د.إ' },
    { type: 'contract_expiry', title: 'Contracts Expiring', title_ar: 'عقود تنتهي قريباً', body: 'All 8 contracts expire on 31 Dec 2026', body_ar: 'جميع العقود الـ8 تنتهي في 31 ديسمبر 2026' },
    { type: 'maintenance_update', title: '3 Costs Pending Approval', title_ar: '3 تكاليف بانتظار الموافقة', body: 'Maintenance costs totaling AED 5,150 need your approval', body_ar: 'تكاليف صيانة بإجمالي 5,150 د.إ بحاجة لموافقتك' },
    { type: 'suspicious_cost', title: 'Suspicious Cost Alert', title_ar: 'تنبيه تكلفة مشبوهة', body: 'AC repair AED 3,500 is 2.5x the unit average', body_ar: 'إصلاح التكييف 3,500 د.إ يعادل 2.5 ضعف متوسط الوحدة' },
    { type: 'recurring_maintenance', title: 'Recurring Issue: A-101', title_ar: 'مشكلة متكررة: A-101', body: 'Unit A-101 has 2 plumbing requests this quarter', body_ar: 'الوحدة A-101 لديها طلبي سباكة هذا الربع' },
  ];
  for (const n of notifs) {
    await prisma.notification.create({
      data: { user_id: OWNER_ID, ...n, is_read: false, metadata: {} },
    });
  }
  console.log('Created', notifs.length, 'notifications');

  console.log('\n=== DEMO DATA SEEDED ===');
  console.log('\nLogin Accounts:');
  console.log('  Owner:    aqari2040@gmail.com / Aqari@2026!');
  console.log('  Employee: employee@aqari.com / Employee@2026!');
  console.log('  Tenant:   ahmed@test.com / Tenant@2026!');
  console.log('\nData Summary:');
  console.log('  2 properties (1 tower + 1 villa complex)');
  console.log('  12 units (8 tower + 4 villa)');
  console.log('  8 tenants with active contracts');
  console.log('  96 payment schedules (Jan-Dec, 3 overdue)');
  console.log('  8 maintenance requests with 6 costs');
  console.log('  5 notifications');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
