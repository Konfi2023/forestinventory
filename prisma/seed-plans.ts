import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding plans...');

  const plans = [
    {
      name: 'Basis',
      maxHectares: 20,
      maxUsers: 1,
      monthlyPrice: 9,
      yearlyPrice: 54,
      monthlyPriceId: 'price_1T534z0AnsjXZIc7KyFojFPG',
      yearlyPriceId: 'price_1T534z0AnsjXZIc786NY9HrS',
      displayOrder: 0,
    },
    {
      name: 'Pro',
      maxHectares: 100,
      maxUsers: 3,
      monthlyPrice: 19,
      yearlyPrice: 114,
      monthlyPriceId: 'price_1T534w0AnsjXZIc7tiG5rsX2',
      yearlyPriceId: 'price_1T534w0AnsjXZIc7amyuCSvp',
      displayOrder: 1,
    },
    {
      name: 'Expert',
      maxHectares: 200,
      maxUsers: 7,
      monthlyPrice: 29,
      yearlyPrice: 174,
      monthlyPriceId: 'price_1T534w0AnsjXZIc7glluUigc',
      yearlyPriceId: 'price_1T534v0AnsjXZIc7ux01BOsU',
      displayOrder: 2,
    },
    {
      name: 'Enterprise',
      maxHectares: null,
      maxUsers: null,
      monthlyPrice: null,
      yearlyPrice: null,
      monthlyPriceId: '',
      yearlyPriceId: '',
      displayOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {
        maxHectares: plan.maxHectares,
        maxUsers: plan.maxUsers,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        monthlyPriceId: plan.monthlyPriceId,
        yearlyPriceId: plan.yearlyPriceId,
        displayOrder: plan.displayOrder,
      },
      create: plan,
    });
    console.log(`  ✓ Plan "${plan.name}" upserted`);
  }

  console.log('Done seeding plans.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
