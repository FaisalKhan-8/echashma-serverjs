const crypto = require('crypto')
const bcrypt = require('bcryptjs')

const OTP_EXPIRY_MS = 10 * 60 * 1000
const OTP_RE = /^\d{6}$/

function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10)
}

async function verifyOtp(plain, hash) {
  if (!hash) return false
  return bcrypt.compare(plain, hash)
}

function otpExpiryDate() {
  return new Date(Date.now() + OTP_EXPIRY_MS)
}

function isOtpExpired(expires) {
  if (!expires) return true
  return new Date() > expires
}

function normalizeOtp(raw) {
  return String(raw || '').trim()
}

function assertValidOtpFormat(otp) {
  if (!OTP_RE.test(otp)) {
    throw new Error('OTP must be exactly 6 digits')
  }
}

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiryDate,
  isOtpExpired,
  normalizeOtp,
  assertValidOtpFormat,
  OTP_EXPIRY_MS,
  OTP_RE
}
