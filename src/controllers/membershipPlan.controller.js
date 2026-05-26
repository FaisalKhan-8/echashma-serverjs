const { Prisma } = require('@prisma/client');
const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const { addDaysUtc } = require('../utils/membershipDates');

const FEATURE_AVAILABILITY = {
  MONTHLY: 'MONTHLY',
  THREE_MONTH: 'THREE_MONTH',
  SIX_MONTH: 'SIX_MONTH',
  ANNUAL: 'ANNUAL',
  ALL: 'ALL',
};

function parseFeatures(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeFeatures(features) {
  return JSON.stringify(
    (features || []).map((f) => ({
      name: String(f.name).trim(),
      availability: f.availability,
    }))
  );
}

function decimalToNumber(value) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function toResponse(plan) {
  const features = parseFeatures(plan.features);

  const matches = (availability, targets) =>
    targets.includes(availability) || availability === 'BOTH';

  const featuresMonthly = features.filter((f) =>
    matches(f.availability, [
      FEATURE_AVAILABILITY.MONTHLY,
      FEATURE_AVAILABILITY.ALL,
    ])
  );
  const featuresThreeMonth = features.filter((f) =>
    matches(f.availability, [
      FEATURE_AVAILABILITY.THREE_MONTH,
      FEATURE_AVAILABILITY.ALL,
    ])
  );
  const featuresSixMonth = features.filter((f) =>
    matches(f.availability, [
      FEATURE_AVAILABILITY.SIX_MONTH,
      FEATURE_AVAILABILITY.ALL,
    ])
  );
  const featuresAnnual = features.filter((f) =>
    matches(f.availability, [
      FEATURE_AVAILABILITY.ANNUAL,
      FEATURE_AVAILABILITY.ALL,
    ])
  );

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description || null,
    monthlyPrice: decimalToNumber(plan.monthlyPrice),
    monthlyOldAmount: decimalToNumber(plan.monthlyOldAmount),
    threeMonthPrice: decimalToNumber(plan.threeMonthPrice),
    threeMonthOldAmount: decimalToNumber(plan.threeMonthOldAmount),
    sixMonthPrice: decimalToNumber(plan.sixMonthPrice),
    sixMonthOldAmount: decimalToNumber(plan.sixMonthOldAmount),
    annualPrice: decimalToNumber(plan.annualPrice),
    annualOldAmount: decimalToNumber(plan.annualOldAmount),
    gstPercentage: decimalToNumber(plan.gstPercentage) ?? 18,
    isPopular: plan.isPopular ?? false,
    order: plan.order ?? 0,
    features: {
      monthly: featuresMonthly,
      threeMonth: featuresThreeMonth,
      sixMonth: featuresSixMonth,
      annual: featuresAnnual,
    },
    status: plan.status,
    createdBy: plan.createdBy ?? null,
    updatedBy: plan.updatedBy ?? null,
  };
}

function actorUserId(req) {
  return req.user?.id ?? req.user?.userId ?? null;
}

function buildPlanData(body, { forCreate = false } = {}) {
  const data = {};

  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) {
    data.description = body.description?.trim() || null;
  }
  if (body.order !== undefined) data.order = body.order;
  if (body.monthlyPrice !== undefined) data.monthlyPrice = body.monthlyPrice;
  if (body.monthlyOldAmount !== undefined) {
    data.monthlyOldAmount = body.monthlyOldAmount;
  }
  if (body.threeMonthPrice !== undefined) {
    data.threeMonthPrice = body.threeMonthPrice;
  }
  if (body.threeMonthOldAmount !== undefined) {
    data.threeMonthOldAmount = body.threeMonthOldAmount;
  }
  if (body.sixMonthPrice !== undefined) data.sixMonthPrice = body.sixMonthPrice;
  if (body.sixMonthOldAmount !== undefined) {
    data.sixMonthOldAmount = body.sixMonthOldAmount;
  }
  if (body.annualPrice !== undefined) data.annualPrice = body.annualPrice;
  if (body.annualOldAmount !== undefined) {
    data.annualOldAmount = body.annualOldAmount;
  }
  if (body.gstPercentage !== undefined) {
    data.gstPercentage = body.gstPercentage;
  } else if (forCreate) {
    data.gstPercentage = 18;
  }
  if (body.isPopular !== undefined) data.isPopular = body.isPopular;
  if (body.features !== undefined) {
    data.features = serializeFeatures(body.features);
  } else if (forCreate) {
    data.features = '[]';
  }
  if (body.status !== undefined) data.status = body.status;
  else if (forCreate) data.status = 'ACTIVE';

  return data;
}

const getAllMembershipPlans = async (req, res, next) => {
  try {
    const plans = await db.membershipPlan.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { order: 'asc' },
    });

    res.json({
      data: plans.map((plan) => toResponse(plan)),
    });
  } catch (error) {
    next(error);
  }
};

const getMembershipPlanById = async (req, res, next) => {
  const planId = parseInt(req.params.id, 10);
  if (Number.isNaN(planId)) {
    return next(new AppError('Invalid membership plan id', 400));
  }

  try {
    const plan = await db.membershipPlan.findFirst({
      where: { id: planId, status: 'ACTIVE' },
    });

    if (!plan) {
      throw new AppError('Membership plan not found', 404);
    }

    res.json(toResponse(plan));
  } catch (error) {
    next(error);
  }
};

const createMembershipPlan = async (req, res, next) => {
  try {
    const existing = await db.membershipPlan.findFirst({
      where: { name: req.body.name.trim() },
    });
    if (existing) {
      throw new AppError(
        `Membership plan with name "${req.body.name}" already exists`,
        409
      );
    }

    const userId = actorUserId(req);
    const data = buildPlanData(req.body, { forCreate: true });
    if (userId) {
      data.createdBy = userId;
      data.updatedBy = userId;
    }
    const plan = await db.membershipPlan.create({ data });

    res.status(201).json(toResponse(plan));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return next(
        new AppError('Membership plan with the same name already exists', 409)
      );
    }
    next(error);
  }
};

const updateMembershipPlan = async (req, res, next) => {
  const planId = parseInt(req.params.id, 10);
  if (Number.isNaN(planId)) {
    return next(new AppError('Invalid membership plan id', 400));
  }

  try {
    if (req.body.name) {
      const duplicate = await db.membershipPlan.findFirst({
        where: {
          name: req.body.name.trim(),
          id: { not: planId },
        },
      });
      if (duplicate) {
        throw new AppError(
          `Membership plan with name "${req.body.name}" already exists`,
          409
        );
      }
    }

    const data = buildPlanData(req.body);
    const userId = actorUserId(req);
    if (userId) {
      data.updatedBy = userId;
    }
    if (Object.keys(data).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const plan = await db.membershipPlan.update({
      where: { id: planId },
      data,
    });

    res.json(toResponse(plan));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return next(new AppError('Membership plan not found', 404));
      }
      if (error.code === 'P2002') {
        return next(
          new AppError('Membership plan with the same name already exists', 409)
        );
      }
    }
    next(error);
  }
};

const deleteMembershipPlan = async (req, res, next) => {
  const planId = parseInt(req.params.id, 10);
  if (Number.isNaN(planId)) {
    return next(new AppError('Invalid membership plan id', 400));
  }

  try {
    const plan = await db.membershipPlan.delete({ where: { id: planId } });
    res.json(toResponse(plan));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return next(new AppError('Membership plan not found', 404));
    }
    next(error);
  }
};

const grantDemoTrial = async (req, res, next) => {
  const { companyId, days } = req.body;

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const now = new Date();
    const membershipEndDate = addDaysUtc(now, days);

    await db.company.update({
      where: { id: companyId },
      data: {
        membership: 'TRIAL',
        membershipStartDate: now,
        membershipEndDate,
      },
    });

    res.json({
      message: `Demo trial of ${days} day(s) granted successfully`,
      membership: 'TRIAL',
      membershipStartDate: now.toISOString(),
      membershipEndDate: membershipEndDate.toISOString(),
      membershipEndDateFormatted: membershipEndDate.toLocaleString(),
      days,
      companyId,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  grantDemoTrial,
};
