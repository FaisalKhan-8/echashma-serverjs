const { Prisma } = require('@prisma/client');
const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

const DISCOUNT_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
};

const COUPON_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
};

const couponInclude = {
  companyUsages: true,
  membershipPlans: { select: { membershipPlanId: true } },
};

function decimalToNumber(value) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function parseBillingPeriods(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function serializeBillingPeriods(periods) {
  if (!periods || periods.length === 0) return null;
  return JSON.stringify(periods);
}

function normalizeCode(code) {
  return code.trim().toUpperCase();
}

/** null, undefined, or 0 = unlimited. */
function isEnforcedUsageLimit(limit) {
  return limit !== null && limit !== undefined && Number(limit) > 0;
}

function effectiveUsageLimitForResponse(limit) {
  return isEnforcedUsageLimit(limit) ? Number(limit) : null;
}

function toResponse(coupon) {
  const planIds =
    coupon.membershipPlans?.map((p) => p.membershipPlanId) ?? [];
  const billingPeriods = parseBillingPeriods(coupon.applicableBillingPeriods);

  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: decimalToNumber(coupon.discountValue),
    expiryDate: coupon.expiryDate ? coupon.expiryDate.toISOString() : null,
    usageLimit: effectiveUsageLimitForResponse(coupon.usageLimit),
    usedCount: coupon.usedCount ?? 0,
    usageLimitPerCompany: effectiveUsageLimitForResponse(
      coupon.usageLimitPerCompany
    ),
    companyUsage:
      coupon.companyUsages && coupon.companyUsages.length > 0
        ? coupon.companyUsages.map((usage) => ({
            companyId: usage.companyId,
            count: usage.count,
          }))
        : [],
    minPurchaseAmount: decimalToNumber(coupon.minPurchaseAmount),
    maxDiscountAmount: decimalToNumber(coupon.maxDiscountAmount),
    applicableMembershipPlans: planIds.length > 0 ? planIds : null,
    applicableBillingPeriods: billingPeriods,
    isPublic: coupon.isPublic ?? false,
    status: coupon.status,
    createdAt: coupon.created_at,
    updatedAt: coupon.updated_at,
  };
}

function calculateDiscount(coupon, purchaseAmount) {
  let discount = 0;
  if (coupon.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    discount = (purchaseAmount * decimalToNumber(coupon.discountValue)) / 100;
    if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
      discount = Math.min(discount, decimalToNumber(coupon.maxDiscountAmount));
    }
  } else {
    discount = Math.min(
      decimalToNumber(coupon.discountValue),
      purchaseAmount
    );
  }
  return discount;
}

async function findCouponByCode(code) {
  return db.coupon.findUnique({
    where: { code: normalizeCode(code) },
    include: couponInclude,
  });
}

async function syncMembershipPlans(couponId, planIds) {
  await db.couponMembershipPlan.deleteMany({ where: { couponId } });
  if (planIds && planIds.length > 0) {
    await db.couponMembershipPlan.createMany({
      data: planIds.map((membershipPlanId) => ({
        couponId,
        membershipPlanId,
      })),
    });
  }
}

function normalizeBillingPeriod(period) {
  if (period == null || period === '') return null;
  const map = {
    monthly: 'monthly',
    MONTHLY: 'monthly',
    threeMonth: 'threeMonth',
    THREE_MONTH: 'threeMonth',
    sixMonth: 'sixMonth',
    SIX_MONTH: 'sixMonth',
    annual: 'annual',
    ANNUAL: 'annual',
  };
  return map[String(period).trim()] ?? String(period).trim();
}

function normalizeBillingPeriodList(periods) {
  if (!periods?.length) return null;
  return periods.map(normalizeBillingPeriod).filter(Boolean);
}

function getCompanyUsageCount(coupon, companyId) {
  const entry = (coupon.companyUsages || []).find(
    (usage) => usage.companyId === companyId
  );
  return entry?.count ?? 0;
}

function runVerificationChecks(coupon, {
  purchaseAmount,
  companyId,
  membershipPlanId,
  billingPeriod,
}) {
  const errors = {};
  let currentCompanyCount = 0;
  let companyUsageLimit = null;

  if (!coupon) {
    errors.code = ['Coupon code not found'];
    return { errors, currentCompanyCount, companyUsageLimit };
  }

  companyUsageLimit = effectiveUsageLimitForResponse(
    coupon.usageLimitPerCompany
  );
  const normalizedBillingPeriod = normalizeBillingPeriod(billingPeriod);

  if (coupon.status !== COUPON_STATUS.ACTIVE) {
    errors.status = [
      `Coupon is ${coupon.status.toLowerCase()}. Only active coupons can be used.`,
    ];
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    errors.expiryDate = [
      `Coupon has expired on ${new Date(coupon.expiryDate).toLocaleDateString()}.`,
    ];
  }

  if (
    isEnforcedUsageLimit(coupon.usageLimit) &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    errors.usageLimit = [
      `Coupon has reached its global usage limit of ${coupon.usageLimit}. It has been used ${coupon.usedCount} times.`,
    ];
  }

  if (companyId) {
    currentCompanyCount = getCompanyUsageCount(coupon, companyId);
    const perCompanyLimit = coupon.usageLimitPerCompany;
    if (
      isEnforcedUsageLimit(perCompanyLimit) &&
      currentCompanyCount >= perCompanyLimit
    ) {
      errors.usageLimitPerCompany = [
        `Your company has already used this coupon ${currentCompanyCount} time(s). Maximum allowed usage per company is ${perCompanyLimit}.`,
      ];
      errors.instituteUsageLimit = [
        `Your institute has already used this coupon ${currentCompanyCount} time(s). Maximum allowed usage per institute is ${perCompanyLimit}.`,
      ];
    }
  }

  const minPurchase = decimalToNumber(coupon.minPurchaseAmount);
  if (minPurchase !== null && purchaseAmount < minPurchase) {
    errors.minPurchaseAmount = [
      `Minimum purchase amount of ₹${minPurchase} is required. Your purchase amount is ₹${purchaseAmount}.`,
    ];
  }

  const planIds =
    coupon.membershipPlans?.map((p) => p.membershipPlanId) ?? [];
  if (planIds.length > 0) {
    if (!membershipPlanId) {
      errors.membershipPlan = [
        'This coupon is restricted to specific membership plans. Please provide a membership plan ID.',
      ];
    } else if (!planIds.includes(membershipPlanId)) {
      errors.membershipPlan = [
        'This coupon is not applicable to the selected membership plan.',
      ];
    }
  }

  const applicablePeriods = normalizeBillingPeriodList(
    parseBillingPeriods(coupon.applicableBillingPeriods)
  );
  if (applicablePeriods && applicablePeriods.length > 0) {
    if (!normalizedBillingPeriod) {
      errors.billingPeriod = [
        'This coupon is restricted to specific billing periods. Please provide a billing period.',
      ];
    } else if (!applicablePeriods.includes(normalizedBillingPeriod)) {
      errors.billingPeriod = [
        `This coupon is not applicable to the "${billingPeriod}" billing period. Applicable periods: ${applicablePeriods.join(', ')}.`,
      ];
    }
  }

  return { errors, currentCompanyCount, companyUsageLimit };
}

const createCoupon = async (req, res, next) => {
  try {
    const code = normalizeCode(req.body.code);
    const existing = await db.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new AppError(`Coupon with code "${req.body.code}" already exists`, 409);
    }

    const coupon = await db.coupon.create({
      data: {
        code,
        description: req.body.description.trim(),
        discountType: req.body.discountType,
        discountValue: req.body.discountValue,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        usageLimit: req.body.usageLimit ?? null,
        usedCount: 0,
        usageLimitPerCompany: req.body.usageLimitPerCompany ?? null,
        minPurchaseAmount: req.body.minPurchaseAmount ?? null,
        maxDiscountAmount: req.body.maxDiscountAmount ?? null,
        applicableBillingPeriods: serializeBillingPeriods(
          req.body.applicableBillingPeriods
        ),
        isPublic: req.body.isPublic ?? false,
        status: req.body.status ?? COUPON_STATUS.ACTIVE,
      },
      include: couponInclude,
    });

    if (req.body.applicableMembershipPlans?.length) {
      await syncMembershipPlans(
        coupon.id,
        req.body.applicableMembershipPlans
      );
    }

    const full = await db.coupon.findUnique({
      where: { id: coupon.id },
      include: couponInclude,
    });

    res.status(201).json(toResponse(full));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(new AppError('Coupon with the same code already exists', 409));
    }
    next(error);
  }
};

const findAllCoupons = async (req, res, next) => {
  try {
    const coupons = await db.coupon.findMany({
      include: couponInclude,
      orderBy: { created_at: 'desc' },
    });

    res.json({
      data: coupons.map((coupon) => toResponse(coupon)),
    });
  } catch (error) {
    next(error);
  }
};

const findOneCoupon = async (req, res, next) => {
  const couponId = parseInt(req.params.id, 10);
  if (Number.isNaN(couponId)) {
    return next(new AppError('Invalid coupon id', 400));
  }

  try {
    const coupon = await db.coupon.findUnique({
      where: { id: couponId },
      include: couponInclude,
    });

    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    res.json(toResponse(coupon));
  } catch (error) {
    next(error);
  }
};

const updateCoupon = async (req, res, next) => {
  const couponId = parseInt(req.params.id, 10);
  if (Number.isNaN(couponId)) {
    return next(new AppError('Invalid coupon id', 400));
  }

  try {
    if (req.body.code) {
      const code = normalizeCode(req.body.code);
      const duplicate = await db.coupon.findFirst({
        where: { code, id: { not: couponId } },
      });
      if (duplicate) {
        throw new AppError(
          `Coupon with code "${req.body.code}" already exists`,
          409
        );
      }
    }

    const data = {};
    if (req.body.code !== undefined) data.code = normalizeCode(req.body.code);
    if (req.body.description !== undefined) {
      data.description = req.body.description.trim();
    }
    if (req.body.discountType !== undefined) {
      data.discountType = req.body.discountType;
    }
    if (req.body.discountValue !== undefined) {
      data.discountValue = req.body.discountValue;
    }
    if (req.body.expiryDate !== undefined) {
      data.expiryDate = req.body.expiryDate
        ? new Date(req.body.expiryDate)
        : null;
    }
    if (req.body.usageLimit !== undefined) {
      data.usageLimit = req.body.usageLimit;
    }
    if (req.body.usageLimitPerCompany !== undefined) {
      data.usageLimitPerCompany = req.body.usageLimitPerCompany;
    }
    if (req.body.minPurchaseAmount !== undefined) {
      data.minPurchaseAmount = req.body.minPurchaseAmount;
    }
    if (req.body.maxDiscountAmount !== undefined) {
      data.maxDiscountAmount = req.body.maxDiscountAmount;
    }
    if (req.body.applicableBillingPeriods !== undefined) {
      data.applicableBillingPeriods = serializeBillingPeriods(
        req.body.applicableBillingPeriods
      );
    }
    if (req.body.isPublic !== undefined) data.isPublic = req.body.isPublic;
    if (req.body.status !== undefined) data.status = req.body.status;

    if (Object.keys(data).length === 0 && req.body.applicableMembershipPlans === undefined) {
      throw new AppError('No fields to update', 400);
    }

    await db.coupon.update({
      where: { id: couponId },
      data,
    });

    if (req.body.applicableMembershipPlans !== undefined) {
      const planIds =
        req.body.applicableMembershipPlans === null
          ? []
          : req.body.applicableMembershipPlans;
      await syncMembershipPlans(couponId, planIds);
    }

    const coupon = await db.coupon.findUnique({
      where: { id: couponId },
      include: couponInclude,
    });

    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    res.json(toResponse(coupon));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return next(new AppError('Coupon not found', 404));
      }
      if (error.code === 'P2002') {
        return next(new AppError('Coupon with the same code already exists', 409));
      }
    }
    next(error);
  }
};

const removeCoupon = async (req, res, next) => {
  const couponId = parseInt(req.params.id, 10);
  if (Number.isNaN(couponId)) {
    return next(new AppError('Invalid coupon id', 400));
  }

  try {
    const coupon = await db.coupon.delete({
      where: { id: couponId },
      include: couponInclude,
    });

    res.json(toResponse(coupon));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return next(new AppError('Coupon not found', 404));
    }
    next(error);
  }
};

const verifyCoupon = async (req, res, next) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: {
        company: ['Company ID is missing from token'],
        institute: ['Institute ID is missing from token'],
      },
    });
  }

  try {
    const result = await verifyCouponWithDetails({
      code: req.body.code,
      purchaseAmount: req.body.purchaseAmount,
      companyId,
      membershipPlanId: req.body.membershipPlanId,
      billingPeriod: req.body.billingPeriod,
    });

    res.json({ data: formatVerifyCouponResponse(result) });
  } catch (error) {
    next(error);
  }
};

function formatVerifyCouponResponse(result) {
  return {
    valid: result.valid,
    discount: result.discount,
    coupon: result.coupon,
    errors: result.errors,
    companyUsageCount: result.companyUsageCount,
    companyUsageLimit: result.companyUsageLimit,
    instituteUsageCount: result.companyUsageCount,
    instituteUsageLimit: result.companyUsageLimit,
  };
}

async function verifyCouponWithDetails({
  code,
  purchaseAmount,
  companyId,
  membershipPlanId,
  billingPeriod,
}) {
  const errors = {};

  try {
    const coupon = await findCouponByCode(code);
    const { errors: checkErrors, currentCompanyCount, companyUsageLimit } =
      runVerificationChecks(coupon, {
        purchaseAmount,
        companyId,
        membershipPlanId,
        billingPeriod,
      });

    if (Object.keys(checkErrors).length > 0) {
      return {
        valid: false,
        discount: 0,
        coupon: null,
        errors: checkErrors,
        companyUsageCount: currentCompanyCount,
        companyUsageLimit,
      };
    }

    const discount = calculateDiscount(coupon, purchaseAmount);

    return {
      valid: true,
      discount,
      coupon: toResponse(coupon),
      errors: {},
      companyUsageCount: currentCompanyCount,
      companyUsageLimit,
    };
  } catch (error) {
    console.error('Error verifying coupon with details:', error);
    errors.system = ['An error occurred while verifying the coupon.'];
    return {
      valid: false,
      discount: 0,
      coupon: null,
      errors,
      companyUsageCount: 0,
      companyUsageLimit: null,
    };
  }
}

async function applyCoupon(code, companyId) {
  try {
    const coupon = await findCouponByCode(code);
    if (!coupon) return;

    await db.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });

    if (companyId) {
      const existing = await db.couponCompanyUsage.findUnique({
        where: {
          couponId_companyId: {
            couponId: coupon.id,
            companyId,
          },
        },
      });

      if (existing) {
        await db.couponCompanyUsage.update({
          where: { id: existing.id },
          data: { count: { increment: 1 } },
        });
      } else {
        await db.couponCompanyUsage.create({
          data: {
            couponId: coupon.id,
            companyId,
            count: 1,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error applying coupon:', error);
  }
}

module.exports = {
  createCoupon,
  findAllCoupons,
  findOneCoupon,
  updateCoupon,
  removeCoupon,
  verifyCoupon,
  verifyCouponWithDetails,
  applyCoupon,
  findCouponByCode,
  calculateDiscount,
  runVerificationChecks,
};
