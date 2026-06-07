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

function hasConsumedTrial(company, now = new Date()) {
  const status = company.membership;
  const endDate = company.membershipEndDate
    ? new Date(company.membershipEndDate)
    : null;

  if (status === 'TRIAL_EXPIRED' || status === 'EXPIRED') {
    return true;
  }

  if (status === 'ACTIVE') {
    return true;
  }

  if (status === 'TRIAL' && endDate !== null && endDate <= now) {
    return true;
  }

  return false;
}

module.exports = {
  getMembershipAccess,
  hasConsumedTrial,
};
