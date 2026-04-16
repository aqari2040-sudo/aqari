import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed maintenance categories
  const categories = [
    { name: 'Plumbing', name_ar: 'سباكة' },
    { name: 'Electrical', name_ar: 'كهرباء' },
    { name: 'HVAC', name_ar: 'تكييف' },
    { name: 'Structural', name_ar: 'هيكلي' },
    { name: 'Painting', name_ar: 'دهان' },
    { name: 'Pest Control', name_ar: 'مكافحة حشرات' },
    { name: 'Appliance', name_ar: 'أجهزة' },
    { name: 'Other', name_ar: 'أخرى' },
  ];

  for (const cat of categories) {
    await prisma.maintenanceCategory.upsert({
      where: { id: cat.name.toLowerCase().replace(/\s/g, '_') },
      update: {},
      create: {
        name: cat.name,
        name_ar: cat.name_ar,
        is_active: true,
      },
    });
  }

  console.log(`Seeded ${categories.length} maintenance categories`);

  // Seed default settings
  const settings = [
    { key: 'duplicate_maintenance_window_days', value: 30 },
    { key: 'ocr_confidence_threshold', value: 0.5 },
    { key: 'default_grace_period_days', value: 7 },
    { key: 'recurring_maintenance_threshold', value: 3 },
    { key: 'recurring_maintenance_window_days', value: 90 },
    { key: 'suspicious_cost_multiplier', value: 2.0 },
    { key: 'max_file_size_mb', value: 5 },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
      },
    });
  }

  console.log(`Seeded ${settings.length} default settings`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
