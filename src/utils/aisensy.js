const axios = require('axios')
const { AppError } = require('../errors/AppError.js')

const AISENSY_URL =
  process.env.AISENSY_API_URL ||
  'https://backend.aisensy.com/campaign/t1/api/v2'

function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  throw new AppError('phone must be a valid 10-digit Indian mobile number', 400)
}

function buildOtpPayload({ destination, otp }) {
  const otpText = String(otp)
  return {
    apiKey: process.env.AISENSY_API_KEY,
    campaignName:
      process.env.AISENSY_OTP_CAMPAIGN || 'discount_otp_verification',
    destination,
    userName: process.env.AISENSY_USER_NAME || 'Echashma',
    templateParams: [otpText],
    source: 'echashma-company-verification',
    media: {},
    buttons: [
      {
        type: 'button',
        sub_type: process.env.AISENSY_OTP_BUTTON_SUB_TYPE || 'url',
        index: 0,
        parameters: [{ type: 'text', text: otpText }]
      }
    ],
    carouselCards: [],
    location: {},
    attributes: {},
    paramsFallbackValue: {
      FirstName: otpText
    }
  }
}

function isAisensySuccess(data) {
  if (!data || typeof data !== 'object') return false
  const success = data.success
  return success === true || success === 'true'
}

async function sendOtpWhatsApp({ destination, otp, contactName }) {
  const apiKey = process.env.AISENSY_API_KEY
  if (!apiKey) {
    throw new AppError('WhatsApp OTP service is not configured', 500)
  }

  const payload = buildOtpPayload({ destination, otp, contactName })

  if (process.env.AISENSY_DEBUG === 'true') {
    console.log('AiSensy OTP request:', {
      destination: payload.destination,
      campaignName: payload.campaignName,
      templateParams: payload.templateParams,
      otp
    })
  }

  try {
    const { data } = await axios.post(AISENSY_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    })

    if (process.env.AISENSY_DEBUG === 'true') {
      console.log('AiSensy OTP response:', data)
    }

    if (!isAisensySuccess(data)) {
      console.error('AiSensy OTP rejected:', data)
      throw new AppError(
        data?.message || 'WhatsApp OTP could not be sent',
        502
      )
    }

    return data
  } catch (err) {
    if (err instanceof AppError) throw err
    const detail = err.response?.data
    console.error('AiSensy OTP error:', detail || err.message)
    const message =
      detail?.message ||
      (typeof detail === 'string' ? detail : null) ||
      'Failed to send WhatsApp OTP'
    throw new AppError(message, 502)
  }
}

module.exports = { normalizeIndianPhone, sendOtpWhatsApp, buildOtpPayload }
