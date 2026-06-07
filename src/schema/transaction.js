const { z } = require('zod');
const { BILLING_PERIOD, PAYMENT_GATEWAY, PAYMENT_METHOD } = require('../utils/membershipTransactionConstants');

const billingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(100),
  phone: z.string().trim().min(1).max(15),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().min(1).max(10),
  country: z.string().trim().min(1).max(100),
});

const priceBreakdownSchema = z.object({
  basePrice: z.number().min(0),
  couponDiscount: z.number().min(0),
  subtotal: z.number().min(0),
  gstAmount: z.number().min(0),
  totalAmount: z.number().min(0),
});

const purchaseMembershipSchema = z
  .object({
    membershipId: z.coerce.number().int().positive(),
    billingPeriod: z.enum([
      BILLING_PERIOD.MONTHLY,
      BILLING_PERIOD.THREE_MONTH,
      BILLING_PERIOD.SIX_MONTH,
      BILLING_PERIOD.ANNUAL,
    ]),
    billingAddress: billingAddressSchema,
    billingAddressSameAsInstitute: z.boolean(),
    paymentMethod: z.enum([PAYMENT_METHOD.ONLINE, PAYMENT_METHOD.OFFLINE]),
    onlineGateway: z
      .enum([PAYMENT_GATEWAY.CASHFREE])
      .optional(),
    chequeDetails: z.record(z.unknown()).optional(),
    couponCode: z.string().trim().max(50).optional(),
    successUrl: z.string().trim().max(500).optional(),
    failureUrl: z.string().trim().max(500).optional(),
    priceBreakdown: priceBreakdownSchema,
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === PAYMENT_METHOD.ONLINE && !data.onlineGateway) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'onlineGateway is required when paymentMethod is online',
        path: ['onlineGateway'],
      });
    }
    if (
      data.paymentMethod === PAYMENT_METHOD.ONLINE &&
      data.onlineGateway &&
      data.onlineGateway !== PAYMENT_GATEWAY.CASHFREE
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only Cashfree is supported for online payments',
        path: ['onlineGateway'],
      });
    }
  });

module.exports = {
  purchaseMembershipSchema,
  billingAddressSchema,
  priceBreakdownSchema,
};
