const multer = require('multer')
const { AppError } = require('../errors/AppError.js')

const MAX_BYTES = 8 * 1024 * 1024

const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

function fileFilter(req, file, cb) {
  if (file.fieldname === 'companyLogo') {
    if (LOGO_TYPES.has(file.mimetype)) {
      return cb(null, true)
    }
    return cb(new AppError('companyLogo must be PNG, JPG, or WebP', 400), false)
  }
  return cb(new AppError(`Unexpected file field: ${file.fieldname}`, 400), false)
}

const kycFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter
}).fields([{ name: 'companyLogo', maxCount: 1 }])

function kycUploadMiddleware(req, res, next) {
  kycFields(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('Each file must be 8 MB or smaller', 400))
      }
      return next(new AppError(err.message, 400))
    }
    next(err)
  })
}

module.exports = { kycUploadMiddleware }
