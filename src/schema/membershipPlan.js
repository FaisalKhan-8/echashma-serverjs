const { z } = require('zod');

const FeatureAvailability = z.enum([
  'MONTHLY',
  'THREE_MONTH',
  'SIX_MONTH',
  'ANNUAL',
  'ALL',
  'BOTH',
]);

const PlanStatus = z.enum(['ACTIVE', 'INACTIVE']);

const membershipFeatureSchema = z.object({
  name: z.string().trim().min(1).max(255),
  availability: FeatureAvailability,
});

const createMembershipPlanSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  order: z.coerce.number().int().min(0).optional(),
  monthlyPrice: z.coerce.number().min(0),
  monthlyOldAmount: z.coerce.number().min(0).optional(),
  threeMonthPrice: z.coerce.number().min(0).optional(),
  threeMonthOldAmount: z.coerce.number().min(0).optional(),
  sixMonthPrice: z.coerce.number().min(0).optional(),
  sixMonthOldAmount: z.coerce.number().min(0).optional(),
  annualPrice: z.coerce.number().min(0).optional(),
  annualOldAmount: z.coerce.number().min(0).optional(),
  gstPercentage: z.coerce.number().min(0).max(100).optional(),
  isPopular: z.boolean().optional(),
  features: z.array(membershipFeatureSchema).optional(),
  status: PlanStatus.optional(),
});

const updateMembershipPlanSchema = createMembershipPlanSchema.partial();

const grantDemoTrialSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  days: z.coerce.number().int().positive(),
});

module.exports = {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  grantDemoTrialSchema,
  FeatureAvailability,
  PlanStatus,
};
