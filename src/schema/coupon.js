const { z } = require('zod');

const DiscountType = z.enum(['PERCENTAGE', 'FIXED']);
const CouponStatus = z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED']);
const BillingPeriod = z.enum([
  'monthly',
  'threeMonth',
  'sixMonth',
  'annual',
  'MONTHLY',
  'THREE_MONTH',
  'SIX_MONTH',
  'ANNUAL',
]);

const couponFieldsSchema = z.object({
  code: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(200),
  discountType: DiscountType,
  discountValue: z.coerce.number().min(0),
  expiryDate: z.union([z.string().datetime(), z.coerce.date()]).optional(),
  usageLimit: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  usageLimitPerCompany: z
    .union([z.coerce.number().int().min(0), z.null()])
    .optional(),
  minPurchaseAmount: z.coerce.number().min(0).optional(),
  maxDiscountAmount: z.coerce.number().min(0).optional(),
  applicableMembershipPlans: z
    .union([z.array(z.coerce.number().int().positive()), z.null()])
    .optional(),
  applicableBillingPeriods: z
    .union([z.array(BillingPeriod), z.null()])
    .optional(),
  isPublic: z.boolean().optional(),
  status: CouponStatus.optional(),
});

function percentageDiscountRefine(data, ctx) {
  if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    });
  }
}

const createCouponSchema = couponFieldsSchema.superRefine(percentageDiscountRefine);

const updateCouponSchema = couponFieldsSchema
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.discountType === 'PERCENTAGE' &&
      data.discountValue !== undefined &&
      data.discountValue > 100
    ) {
      percentageDiscountRefine(
        { discountType: 'PERCENTAGE', discountValue: data.discountValue },
        ctx
      );
    }
  });

const verifyCouponSchema = z.object({
  code: z.string().trim().min(1).max(50),
  purchaseAmount: z.coerce.number().min(0),
  membershipPlanId: z.coerce.number().int().positive().optional(),
  billingPeriod: BillingPeriod.optional(),
});

module.exports = {
  createCouponSchema,
  updateCouponSchema,
  verifyCouponSchema,
  DiscountType,
  CouponStatus,
  BillingPeriod,
};
