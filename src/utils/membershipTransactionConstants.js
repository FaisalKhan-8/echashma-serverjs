const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
};

const BILLING_PERIOD = {
  MONTHLY: 'monthly',
  THREE_MONTH: 'threeMonth',
  SIX_MONTH: 'sixMonth',
  ANNUAL: 'annual',
};

const PAYMENT_GATEWAY = {
  CASHFREE: 'cashfree',
};

const PAYMENT_METHOD = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};

const BILLING_PERIOD_LABELS = {
  [BILLING_PERIOD.MONTHLY]: 'Monthly',
  [BILLING_PERIOD.THREE_MONTH]: '3 Months',
  [BILLING_PERIOD.SIX_MONTH]: '6 Months',
  [BILLING_PERIOD.ANNUAL]: 'Annual',
};

function addBillingPeriod(startDate, billingPeriod) {
  const end = new Date(startDate);
  switch (billingPeriod) {
    case BILLING_PERIOD.MONTHLY:
      end.setMonth(end.getMonth() + 1);
      break;
    case BILLING_PERIOD.THREE_MONTH:
      end.setMonth(end.getMonth() + 3);
      break;
    case BILLING_PERIOD.SIX_MONTH:
      end.setMonth(end.getMonth() + 6);
      break;
    case BILLING_PERIOD.ANNUAL:
      end.setMonth(end.getMonth() + 12);
      break;
    default:
      throw new Error(`Invalid billing period: ${billingPeriod}`);
  }
  return end;
}

function getBasePriceForPeriod(plan, billingPeriod) {
  switch (billingPeriod) {
    case BILLING_PERIOD.MONTHLY:
      return plan.monthlyPrice != null ? Number(plan.monthlyPrice) : null;
    case BILLING_PERIOD.THREE_MONTH:
      return plan.threeMonthPrice != null ? Number(plan.threeMonthPrice) : null;
    case BILLING_PERIOD.SIX_MONTH:
      return plan.sixMonthPrice != null ? Number(plan.sixMonthPrice) : null;
    case BILLING_PERIOD.ANNUAL:
      return plan.annualPrice != null ? Number(plan.annualPrice) : null;
    default:
      return null;
  }
}

function parseJsonField(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function serializeTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    uuid: row.uuid,
    membershipPlanId: row.membershipPlanId,
    companyId: row.companyId,
    billingPeriod: row.billingPeriod,
    billingAddress: parseJsonField(row.billingAddressJson, {}),
    billingAddressSameAsCompany: row.billingAddressSameAsCompany,
    paymentGateway: row.paymentGateway,
    paymentMethod: row.paymentMethod,
    priceBreakdown: parseJsonField(row.priceBreakdownJson, {}),
    couponCode: row.couponCode,
    successUrl: row.successUrl,
    failureUrl: row.failureUrl,
    transactionStatus: row.transactionStatus,
    cashfreeOrderId: row.cashfreeOrderId,
    cashfreeCfOrderId: row.cashfreeCfOrderId,
    cashfreePaymentSessionId: row.cashfreePaymentSessionId,
    cashfreePaymentId: row.cashfreePaymentId,
    failureReason: row.failureReason,
    subscriptionStartDate: row.subscriptionStartDate,
    subscriptionEndDate: row.subscriptionEndDate,
    nextBillingDate: row.nextBillingDate,
    invoicePdfUrl: row.invoicePdfUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    membershipPlan: row.membershipPlan
      ? {
          id: row.membershipPlan.id,
          name: row.membershipPlan.name,
          description: row.membershipPlan.description,
        }
      : undefined,
  };
}

module.exports = {
  TRANSACTION_STATUS,
  BILLING_PERIOD,
  PAYMENT_GATEWAY,
  PAYMENT_METHOD,
  BILLING_PERIOD_LABELS,
  addBillingPeriod,
  getBasePriceForPeriod,
  parseJsonField,
  serializeTransaction,
};
