const MEMBERSHIP_TRIAL_DAYS = 15;

function addDaysUtc(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Resolve start/end from optional fields; empty object = use DB defaults. */
function resolveMembershipWindow({ membershipStartDate, membershipEndDate } = {}) {
  if (membershipStartDate && membershipEndDate) {
    return { membershipStartDate, membershipEndDate };
  }
  if (membershipStartDate) {
    return {
      membershipStartDate,
      membershipEndDate: addDaysUtc(membershipStartDate, MEMBERSHIP_TRIAL_DAYS),
    };
  }
  if (membershipEndDate) {
    return {
      membershipStartDate: addDaysUtc(membershipEndDate, -MEMBERSHIP_TRIAL_DAYS),
      membershipEndDate,
    };
  }
  return {};
}

/** Trial window for public registration: start = now, end = now + trial days (server clock). */
function newRegistrationMembershipDates() {
  const membershipStartDate = new Date();
  return {
    membershipStartDate,
    membershipEndDate: addDaysUtc(membershipStartDate, MEMBERSHIP_TRIAL_DAYS),
  };
}

module.exports = {
  MEMBERSHIP_TRIAL_DAYS,
  addDaysUtc,
  resolveMembershipWindow,
  newRegistrationMembershipDates,
};
