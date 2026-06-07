const cron = require('node-cron')
const db = require('../utils/db.config')

const LOG_PREFIX = '[MembershipExpiryCron]'

/**
 * Marks paid memberships (ACTIVE) and trials (TRIAL) as expired when
 * membershipEndDate is in the past.
 */
async function checkAndMarkExpiredMemberships() {
  console.log(
    `${LOG_PREFIX} Starting membership expiry check (IST timezone)...`
  )

  try {
    const now = new Date()

    const expiredPaid = await db.company.findMany({
      where: {
        membership: 'ACTIVE',
        membershipEndDate: { lt: now }
      },
      select: {
        id: true,
        companyName: true,
        membershipEndDate: true,
        membershipName: true
      }
    })

    const updatePaidResult = await db.company.updateMany({
      where: {
        membership: 'ACTIVE',
        membershipEndDate: { lt: now }
      },
      data: {
        membership: 'EXPIRED'
      }
    })

    const updateTrialResult = await db.company.updateMany({
      where: {
        membership: 'TRIAL',
        membershipEndDate: { lt: now }
      },
      data: {
        membership: 'TRIAL_EXPIRED'
      }
    })

    const totalExpired = updatePaidResult.count + updateTrialResult.count

    if (totalExpired === 0) {
      console.log(`${LOG_PREFIX} No expired memberships or trials found.`)
      return
    }

    console.log(
      `${LOG_PREFIX} Found ${expiredPaid.length} expired paid membership(s) and ${updateTrialResult.count} expired trial(s) to update.`
    )
    console.log(
      `${LOG_PREFIX} Successfully marked ${totalExpired} membership(s) or trial(s) as expired.`
    )

    if (expiredPaid.length > 0) {
      const expiredDetails = expiredPaid.map((company) => ({
        companyId: company.id,
        companyName: company.companyName,
        expiryDate: company.membershipEndDate,
        membershipPlan: company.membershipName
      }))
      console.log(`${LOG_PREFIX} Expired memberships details:`, expiredDetails)
    }
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Error in membership expiry check cron job:`,
      error instanceof Error ? error.message : error
    )
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
  }
}

/**
 * Daily at 00:00 IST — mark ACTIVE → EXPIRED and TRIAL → TRIAL_EXPIRED.
 * Cron: '0 0 * * *', timezone: Asia/Kolkata
 */
function startMembershipExpiryCron() {
  cron.schedule('0 0 * * *', checkAndMarkExpiredMemberships, {
    timezone: 'Asia/Kolkata'
  })

  // cron.schedule('* * * * *', checkAndMarkExpiredMemberships, {
  //   timezone: 'Asia/Kolkata'
  // })

  console.log(`${LOG_PREFIX} Scheduled daily at 00:00 IST (Asia/Kolkata).`)
}

module.exports = {
  startMembershipExpiryCron,
  checkAndMarkExpiredMemberships
}
