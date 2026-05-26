const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const {
  addDaysUtc,
  MEMBERSHIP_TRIAL_DAYS,
} = require('../utils/membershipDates');

function requireCompanyId(req, res) {
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: {
        authorization: ['Company ID is missing from token'],
      },
    });
    return null;
  }
  return companyId;
}

function getMembershipAccess(company) {
  const now = new Date();
  const status = company.membership;
  const endDate = company.membershipEndDate
    ? new Date(company.membershipEndDate)
    : null;

  const isInTrial =
    status === 'TRIAL' && endDate !== null && endDate > now;
  const hasPaidAccess =
    status === 'ACTIVE' && endDate !== null && endDate > now;
  const hasAccess = isInTrial || hasPaidAccess;

  return {
    hasAccess,
    isInTrial,
    requiresPurchase: !hasAccess,
  };
}

const getMembershipStatus = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        membership: true,
        membershipStartDate: true,
        membershipEndDate: true,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const access = getMembershipAccess(company);
    const trialEndsAt =
      company.membership === 'TRIAL' ? company.membershipEndDate : null;
    const membershipExpiryDate =
      company.membership === 'ACTIVE' ? company.membershipEndDate : null;

    res.json({
      membershipStatus: company.membership ?? null,
      membershipPlanId: null,
      membershipName: null,
      membershipExpiryDate,
      trialEndsAt,
      membershipStartDate: company.membershipStartDate ?? null,
      ...access,
    });
  } catch (error) {
    next(error);
  }
};

const startTrial = async (req, res, next) => {
  const companyId = requireCompanyId(req, res);
  if (companyId === null) return;

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: {
        membership: true,
        membershipEndDate: true,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const now = new Date();
    const trialEndsAt = company.membershipEndDate
      ? new Date(company.membershipEndDate)
      : null;
    const status = company.membership;

    if (
      status === 'ACTIVE' &&
      trialEndsAt !== null &&
      trialEndsAt > now
    ) {
      throw new AppError(
        'You already have an active membership. No trial needed.',
        400
      );
    }

    if (status === 'TRIAL' && trialEndsAt !== null && trialEndsAt > now) {
      return res.json({
        message: 'Trial already active',
        trialEndsAt: trialEndsAt.toISOString(),
        trialEndsAtFormatted: trialEndsAt.toLocaleString(),
        daysRemaining: MEMBERSHIP_TRIAL_DAYS,
      });
    }

    const newTrialEndsAt = addDaysUtc(now, MEMBERSHIP_TRIAL_DAYS);

    await db.company.update({
      where: { id: companyId },
      data: {
        membership: 'TRIAL',
        membershipStartDate: now,
        membershipEndDate: newTrialEndsAt,
      },
    });

    res.json({
      message: `${MEMBERSHIP_TRIAL_DAYS}-day trial started successfully`,
      trialEndsAt: newTrialEndsAt.toISOString(),
      trialEndsAtFormatted: newTrialEndsAt.toLocaleString(),
      daysRemaining: MEMBERSHIP_TRIAL_DAYS,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMembershipStatus,
  startTrial,
};
