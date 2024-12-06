const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Sanitize and validate username
const sanitizeUsername = (username) => {
  if (!username || typeof username !== 'string') return 'anonymous';
  const sanitized = username.trim().replace(/\s+/g, '_');
  return sanitized.slice(0, 30); // Limit to 30 characters
};

// Set up multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the uploads directory
  },
  filename: function (req, file, cb) {
    const username = sanitizeUsername(req.body.contactPerson || 'anonymous');
    const uniqueId = uuidv4(); // Generate a unique identifier
    cb(null, `${username}-${uniqueId}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5 MB
  },
}).fields([
  { name: 'pancard', maxCount: 1 },
  { name: 'aadhaarcard', maxCount: 1 },
]);

module.exports = upload;
