require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const demoPlans = [
  {
    name: 'Starter',
    description:
      'Essential tools for a single-branch optical shop getting started on Echashma.',
    order: 0,
    monthlyPrice: 499,
    monthlyOldAmount: 599,
    threeMonthPrice: null,
    threeMonthOldAmount: null,
    sixMonthPrice: null,
    sixMonthOldAmount: null,
    annualPrice: null,
    annualOldAmount: null,
    gstPercentage: 18,
    isPopular: false,
    status: 'ACTIVE',
    features: [
      { name: 'Customer invoices', availability: 'ALL' },
      { name: 'Inventory (single branch)', availability: 'ALL' },
      { name: 'Purchase & supplier', availability: 'MONTHLY' },
      { name: 'Basic reports', availability: 'MONTHLY' },
      { name: 'Email support', availability: 'ALL' },
    ],
  },
  {
    name: 'Pro',
    description:
      'Best for growing clinics with multiple branches, WhatsApp, and advanced billing.',
    order: 1,
    monthlyPrice: 999,
    monthlyOldAmount: 1299,
    threeMonthPrice: 2697,
    threeMonthOldAmount: 2997,
    sixMonthPrice: 4999,
    sixMonthOldAmount: 5499,
    annualPrice: 9999,
    annualOldAmount: 11999,
    gstPercentage: 18,
    isPopular: true,
    status: 'ACTIVE',
    features: [
      { name: 'Everything in Starter', availability: 'ALL' },
      { name: 'Multi-branch management', availability: 'ALL' },
      { name: 'WhatsApp order updates', availability: 'ANNUAL' },
      { name: 'Expense tracking', availability: 'ALL' },
      { name: 'KYC & company documents', availability: 'ALL' },
      { name: 'Prescription module', availability: 'ALL' },
      { name: 'Priority support', availability: 'SIX_MONTH' },
    ],
  },
  {
    name: 'Enterprise',
    description:
      'Unlimited scale, custom integrations, and dedicated onboarding for large chains.',
    order: 2,
    monthlyPrice: 2499,
    monthlyOldAmount: 2999,
    threeMonthPrice: 6999,
    threeMonthOldAmount: 7999,
    sixMonthPrice: 12999,
    sixMonthOldAmount: 14999,
    annualPrice: 24999,
    annualOldAmount: 29999,
    gstPercentage: 18,
    isPopular: false,
    status: 'ACTIVE',
    features: [
      { name: 'Everything in Pro', availability: 'ALL' },
      { name: 'Unlimited branches & users', availability: 'ALL' },
      { name: 'API access', availability: 'ANNUAL' },
      { name: 'Custom branding', availability: 'ALL' },
      { name: 'Dedicated account manager', availability: 'ANNUAL' },
      { name: 'SLA & phone support', availability: 'ALL' },
      { name: 'Data export & backups', availability: 'ALL' },
    ],
  },
];

async function main() {
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true },
  });
  const actorId = superAdmin?.id ?? null;

  for (const plan of demoPlans) {
    const features = JSON.stringify(plan.features);
    const { features: _f, ...data } = plan;

    await prisma.membershipPlan.upsert({
      where: { name: plan.name },
      create: {
        ...data,
        features,
        createdBy: actorId,
        updatedBy: actorId,
      },
      update: {
        ...data,
        features,
        updatedBy: actorId,
      },
    });
    console.log(`✓ ${plan.name}`);
  }

  console.log(`\nSeeded ${demoPlans.length} membership plan(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
