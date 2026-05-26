const db = require('../utils/db.config.js')
const { AppError } = require('../errors/AppError.js')
const { uploadPublicObject } = require('../utils/s3.js')

const AADHAAR_RE = /^\d{12}$/
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/

function normalizePanNo(raw) {
  if (raw === undefined || raw === null) return null
  const s = String(raw).trim()
  if (s === '' || s.toLowerCase() === 'null') return null
  return s.toUpperCase()
}

function assertCompanyAccess(req, companyIdNum) {
  const { role, companyId: userCompanyId } = req.user
  if (role === 'SUPER_ADMIN') return
  if (!userCompanyId || userCompanyId !== companyIdNum) {
    throw new AppError('You cannot submit KYC for this company', 403)
  }
  const allowed = ['ADMIN', 'SUBADMIN', 'MANAGER']
  if (!allowed.includes(role)) {
    throw new AppError('You do not have permission to submit KYC', 403)
  }
}

async function uploadKycFile(file, folder) {
  if (!file || !file.buffer) return null
  const { url } = await uploadPublicObject({
    body: file.buffer,
    folder,
    originalName: file.originalname,
    contentType: file.mimetype
  })
  return url
}

/**
 * POST multipart/form-data: companyId, address, aadhaarNo, panNo (optional),
 * files companyLogo, adharcard (required), pancard (optional).
 */
const submitKyc = async (req, res, next) => {
  try {
    const companyIdRaw = req.body.companyId
    const companyIdNum = parseInt(companyIdRaw, 10)
    if (Number.isNaN(companyIdNum)) {
      throw new AppError('companyId is required and must be a number', 400)
    }

    assertCompanyAccess(req, companyIdNum)

    const address = (req.body.address || '').trim()
    if (!address) {
      throw new AppError('address is required', 400)
    }

    const aadhaarDigits = String(req.body.aadhaarNo || '').replace(/\D/g, '')
    if (!AADHAAR_RE.test(aadhaarDigits)) {
      throw new AppError('aadhaarNo must be exactly 12 digits', 400)
    }

    const panNo = normalizePanNo(req.body.panNo)
    if (panNo !== null && !PAN_RE.test(panNo)) {
      throw new AppError('panNo must match format AAAAA9999A when provided', 400)
    }

    const logoFile = req.files?.companyLogo?.[0]
    const adharFile = req.files?.adharcard?.[0]
    const panFile = req.files?.pancard?.[0]

    if (!logoFile) {
      throw new AppError('companyLogo file is required', 400)
    }
    if (!adharFile) {
      throw new AppError('adharcard file is required', 400)
    }

    const existing = await db.company.findUnique({
      where: { id: companyIdNum }
    })
    if (!existing) {
      throw new AppError('Company not found', 404)
    }

    const folder = `kyc/${companyIdNum}`

    const companyLogoUrl = await uploadKycFile(logoFile, folder)
    const aadhaarcardUrl = await uploadKycFile(adharFile, folder)
    let pancardUrl = null
    if (panFile) {
      pancardUrl = await uploadKycFile(panFile, folder)
    }

    const data = {
      address,
      aadhaarNo: aadhaarDigits,
      panNo,
      companyLogo: companyLogoUrl,
      aadhaarcard: aadhaarcardUrl,
      kyc: 'VERIFIED'
    }
    if (pancardUrl) {
      data.pancard = pancardUrl
    }

    const company = await db.company.update({
      where: { id: companyIdNum },
      data
    })

    res.status(200).json({
      status: 'success',
      message: 'KYC submitted successfully',
      company: {
        id: company.id,
        address: company.address,
        aadhaarNo: company.aadhaarNo,
        panNo: company.panNo,
        companyLogo: company.companyLogo,
        aadhaarcard: company.aadhaarcard,
        pancard: company.pancard,
        kyc: company.kyc
      }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitKyc }
