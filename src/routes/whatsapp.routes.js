const { Router } = require('express');
const multer = require('multer');
const authenticateUser = require('../middleware/authenticateUser');
const {
  uploadAndSendMediaFromForm,
} = require('../controllers/whatsapp.controller');

const router = Router();
const upload = multer(); // in-memory storage

// API: Send Media (upload + send in one go)
router.post(
  '/sendMedia',
  authenticateUser,
  upload.single('file'),
  async (req, res, next) => {
    try {
      const companyId = req.user.companyId;
      const { to, caption } = req.body;
      const file = req.file;

      if (!to || !file) {
        return res
          .status(400)
          .json({ error: 'Recipient number and file are required' });
      }

      const result = await uploadAndSendMediaFromForm(
        companyId,
        to,
        file.buffer,
        file.originalname,
        file.mimetype,
        caption
      );

      res.json({ status: 'success', data: result });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
