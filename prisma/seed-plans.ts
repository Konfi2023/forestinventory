import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding plans...');

  const plans = [
    {
      name: 'Basis',
      maxHectares: 20,
      maxUsers: 1,
      monthlyPrice: 4.90,
      yearlyPrice: 24.95,
      monthlyPriceId: 'price_1TCMzd0AnsjXZIc7lpggqigA',
      yearlyPriceId: 'price_1TCN9N0AnsjXZIc7KIzo4WF2',
      displayOrder: 0,
    },
    {
      name: 'Pro',
      maxHectares: 100,
      maxUsers: 3,
      monthlyPrice: 19.90,
      yearlyPrice: 99.95,
      monthlyPriceId: 'price_1TCNA60AnsjXZIc7omddf5mX',
      yearlyPriceId: 'price_1TCNB80AnsjXZIc7aOChljaj',
      displayOrder: 1,
    },
    {
      name: 'Expert',
      maxHectares: 200,
      maxUsers: 7,
      monthlyPrice: 39.90,
      yearlyPrice: 199.95,
      monthlyPriceId: 'price_1TCNC20AnsjXZIc7QrMc5zVH',
      yearlyPriceId: 'price_1TCNDO0AnsjXZIc75dw44Uyt',
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
