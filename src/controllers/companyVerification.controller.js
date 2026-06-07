const db = require('../utils/db.config.js')
const { AppError } = require('../errors/AppError.js')
const sendEmail = require('../utils/sendEmail.js')
const { buildEmailVerificationOtpHtml } = require('../utils/emailTemplates.js')
const {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiryDate,
  isOtpExpired,
  normalizeOtp,
  OTP_RE
} = require('../utils/otp.js')
const { normalizeIndianPhone, sendOtpWhatsApp } = require('../utils/aisensy.js')

function assertCompanyAccess(req, companyIdNum) {
  const { role, companyId: userCompanyId } = req.user
  if (role === 'SUPER_ADMIN') return
  if (!userCompanyId || userCompanyId !== companyIdNum) {
    throw new AppError('You cannot verify this company', 403)
  }
  const allowed = ['ADMIN', 'SUBADMIN', 'MANAGER']
  if (!allowed.includes(role)) {
    throw new AppError('You do not have permission to verify this company', 403)
  }
}

function parseCompanyId(raw) {
  const companyIdNum = parseInt(raw, 10)
  if (Number.isNaN(companyIdNum)) {
    throw new AppError('companyId is required and must be a number', 400)
  }
  return companyIdNum
}

function verificationPayload(company) {
  return {
    id: company.id,
    email: company.email,
    phone: company.phone,
    emailVerified: company.emailVerified,
    phoneVerified: company.phoneVerified
  }
}

function resolveCompanyIdForStatus(req, res) {
  const { role, companyId: tokenCompanyId } = req.user

  if (role === 'SUPER_ADMIN') {
    if (req.query.companyId !== undefined) {
      const companyIdNum = parseInt(req.query.companyId, 10)
      if (Number.isNaN(companyIdNum)) {
        throw new AppError('companyId must be a number', 400)
      }
      return companyIdNum
    }
    if (tokenCompanyId) return tokenCompanyId
    throw new AppError('companyId query parameter is required', 400)
  }

  if (!tokenCompanyId) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: {
        authorization: ['Company ID is missing from token']
      }
    })
    return null
  }

  assertCompanyAccess(req, tokenCompanyId)
  return tokenCompanyId
}

function statusPayload(company) {
  const kycVerified = company.kyc === 'VERIFIED'
  const contactsVerified = company.emailVerified && company.phoneVerified

  return {
    status: 'success',
    verification: {
      email: company.email,
      phone: company.phone,
      emailVerified: company.emailVerified,
      phoneVerified: company.phoneVerified,
      contactsVerified
    },
    kyc: {
      status: company.kyc,
      verified: kycVerified,
      address: company.address,
      companyLogo: company.companyLogo
    },
    isFullyVerified: contactsVerified && kycVerified
  }
}

async function loadCompany(companyIdNum) {
  const company = await db.company.findUnique({
    where: { id: companyIdNum }
  })
  if (!company) {
    throw new AppError('Company not found', 404)
  }
  return company
}

const sendEmailOtp = async (req, res, next) => {
  try {
    const companyIdNum = parseCompanyId(req.body.companyId)
    assertCompanyAccess(req, companyIdNum)

    const company = await loadCompany(companyIdNum)

    if (company.emailVerified) {
      return res.status(200).json({
        status: 'success',
        message: 'Email is already verified',
        company: verificationPayload(company)
      })
    }

    if (!company.email) {
      throw new AppError('Company email is not set', 400)
    }

    const otp = generateOtp()
    const hashedOtp = await hashOtp(otp)

    await db.company.update({
      where: { id: companyIdNum },
      data: {
        emailOtp: hashedOtp,
        emailOtpExpires: otpExpiryDate()
      }
    })

    await sendEmail({
      to: company.email,
      subject: 'E-chashma — Verify your company email',
      html: buildEmailVerificationOtpHtml({
        otp,
        companyName: company.companyName,
        recipientEmail: company.email
      })
    })

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to company email',
      company: verificationPayload(company)
    })
  } catch (err) {
    next(err)
  }
}

const verifyEmailOtp = async (req, res, next) => {
  try {
    const companyIdNum = parseCompanyId(req.body.companyId)
    assertCompanyAccess(req, companyIdNum)

    const otp = normalizeOtp(req.body.otp)
    if (!OTP_RE.test(otp)) {
      throw new AppError('otp must be exactly 6 digits', 400)
    }

    const company = await loadCompany(companyIdNum)

    if (company.emailVerified) {
      return res.status(200).json({
        status: 'success',
        message: 'Email is already verified',
        company: verificationPayload(company)
      })
    }

    if (isOtpExpired(company.emailOtpExpires)) {
      throw new AppError('OTP has expired. Request a new one.', 400)
    }

    const valid = await verifyOtp(otp, company.emailOtp)
    if (!valid) {
      throw new AppError('Invalid OTP', 400)
    }

    const updated = await db.company.update({
      where: { id: companyIdNum },
      data: {
        emailVerified: true,
        emailOtp: null,
        emailOtpExpires: null
      }
    })

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
      company: verificationPayload(updated)
    })
  } catch (err) {
    next(err)
  }
}

const sendPhoneOtp = async (req, res, next) => {
  try {
    const companyIdNum = parseCompanyId(req.body.companyId)
    assertCompanyAccess(req, companyIdNum)

    const company = await loadCompany(companyIdNum)

    if (company.phoneVerified) {
      return res.status(200).json({
        status: 'success',
        message: 'Phone number is already verified',
        company: verificationPayload(company)
      })
    }

    if (!company.phone) {
      throw new AppError('Company phone number is not set', 400)
    }

    const destination = normalizeIndianPhone(company.phone)
    const otp = generateOtp()
    const hashedOtp = await hashOtp(otp)

    await sendOtpWhatsApp({
      destination,
      otp,
      contactName: company.contactPerson
    })

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[company-verification] WhatsApp OTP for company ${companyIdNum} → ${destination}: ${otp}`
      )
    }

    await db.company.update({
      where: { id: companyIdNum },
      data: {
        phoneOtp: hashedOtp,
        phoneOtpExpires: otpExpiryDate()
      }
    })

    res.status(200).json({
      status: 'success',
      message: 'OTP sent to company phone via WhatsApp',
      company: verificationPayload(company)
    })
  } catch (err) {
    next(err)
  }
}

const verifyPhoneOtp = async (req, res, next) => {
  try {
    const companyIdNum = parseCompanyId(req.body.companyId)
    assertCompanyAccess(req, companyIdNum)

    const otp = normalizeOtp(req.body.otp)
    if (!OTP_RE.test(otp)) {
      throw new AppError('otp must be exactly 6 digits', 400)
    }

    const company = await loadCompany(companyIdNum)

    if (company.phoneVerified) {
      return res.status(200).json({
        status: 'success',
        message: 'Phone number is already verified',
        company: verificationPayload(company)
      })
    }

    if (isOtpExpired(company.phoneOtpExpires)) {
      throw new AppError('OTP has expired. Request a new one.', 400)
    }

    const valid = await verifyOtp(otp, company.phoneOtp)
    if (!valid) {
      throw new AppError('Invalid OTP', 400)
    }

    const updated = await db.company.update({
      where: { id: companyIdNum },
      data: {
        phoneVerified: true,
        phoneOtp: null,
        phoneOtpExpires: null
      }
    })

    res.status(200).json({
      status: 'success',
      message: 'Phone number verified successfully',
      company: verificationPayload(updated)
    })
  } catch (err) {
    next(err)
  }
}

const getVerificationStatus = async (req, res, next) => {
  try {
    const companyIdNum = resolveCompanyIdForStatus(req, res)
    if (companyIdNum === null) return

    const company = await db.company.findUnique({
      where: { id: companyIdNum },
      select: {
        id: true,
        email: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        kyc: true,
        address: true,
        companyLogo: true
      }
    })

    if (!company) {
      throw new AppError('Company not found', 404)
    }

    res.status(200).json({
      ...statusPayload(company),
      companyId: company.id
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  getVerificationStatus
}
