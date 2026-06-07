const jwt = require('jsonwebtoken');
const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');
const { getMembershipAccess } = require('../utils/membershipAccess');

const EXEMPT_EXACT_PATHS = new Set([
  '/company/registerCompany',
  '/membership/me/status',
  '/membership/me/start-trial',
  '/coupons/verify',
  '/company/me/verification-status',
  '/company/kyc/submit',
]);

const EXEMPT_PREFIXES = [
  '/auth',
  '/membership-plans',
  '/company/verification/',
  '/transactions',
];

function isExemptPath(path) {
  if (EXEMPT_EXACT_PATHS.has(path)) {
    return true;
  }

  return EXEMPT_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function attachUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      companyId: decoded.companyId,
      branchId: decoded.branchId,
      membership: decoded.membership ?? null,
      kyc: decoded.kyc ?? null,
    };
    return req.user;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired!', 401);
    }
    throw new AppError('Invalid token!', 401);
  }
}

const requireMembership = async (req, res, next) => {
  if (isExemptPath(req.path)) {
    return next();
  }

  let user;
  try {
    user = req.user ?? attachUserFromToken(req);
  } catch (error) {
    return next(error);
  }

  if (!user) {
    return next();
  }

  if (user.role === 'SUPER_ADMIN' || !user.companyId) {
    return next();
  }

  try {
    const company = await db.company.findUnique({
      where: { id: user.companyId },
      select: {
        membership: true,
        membershipEndDate: true,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const access = getMembershipAccess(company);
    if (!access.hasAccess) {
      return res.status(403).json({
        status: 'error',
        message: 'Active membership or trial required',
        membershipStatus: company.membership ?? null,
        requiresPurchase: true,
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = requireMembership;
