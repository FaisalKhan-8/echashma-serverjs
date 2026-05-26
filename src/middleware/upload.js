const multer = require('multer');
const { AppError } = require('../errors/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
}).fields([
  { name: 'pancard', maxCount: 1 },
  { name: 'adharcard', maxCount: 1 },
  { name: 'companyLogo', maxCount: 1 },
]);

// Error handler for multer-specific errors

module.exports = upload;
