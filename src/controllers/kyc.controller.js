const db = require('../utils/db.config.js')
const { AppError } = require('../errors/AppError.js')
const { uploadPublicObject } = require('../utils/s3.js')

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
 * POST multipart/form-data: companyId, address, optional file companyLogo.
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

    const logoFile = req.files?.companyLogo?.[0]

    const existing = await db.company.findUnique({
      where: { id: companyIdNum }
    })
    if (!existing) {
      throw new AppError('Company not found', 404)
    }

    const data = {
      address,
      kyc: 'VERIFIED'
    }

    if (logoFile) {
      const folder = `kyc/${companyIdNum}`
      data.companyLogo = await uploadKycFile(logoFile, folder)
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
        companyLogo: company.companyLogo,
        kyc: company.kyc
      }
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { submitKyc }
