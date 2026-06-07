const { Router } = require('express');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const {
  createCompany,
  registerCompany,
  upload, // Import upload here
  getAllCompanies,
  updateCompany,
  deleteCompany,
  getCompanyById,
  updateDocument,
  setCompanyWhatsAppConfig,
} = require('../controllers/companies.controller');
const authenticateUser = require('../middleware/authenticateUser');
const { kycUploadMiddleware } = require('../middleware/kycUpload');
const { submitKyc } = require('../controllers/kyc.controller');
const {
  sendEmailOtp,
  verifyEmailOtp,
  sendPhoneOtp,
  verifyPhoneOtp,
  getVerificationStatus,
} = require('../controllers/companyVerification.controller');

const companyRoutes = Router();

companyRoutes.post('/registerCompany', registerCompany);
companyRoutes.post(
  '/verification/email/send',
  authenticateUser,
  sendEmailOtp
);
companyRoutes.post(
  '/verification/email/verify',
  authenticateUser,
  verifyEmailOtp
);
companyRoutes.post(
  '/verification/phone/send',
  authenticateUser,
  sendPhoneOtp
);
companyRoutes.post(
  '/verification/phone/verify',
  authenticateUser,
  verifyPhoneOtp
);
companyRoutes.get(
  '/me/verification-status',
  authenticateUser,
  getVerificationStatus
);
companyRoutes.post(
  '/kyc/submit',
  authenticateUser,
  kycUploadMiddleware,
  submitKyc
);
companyRoutes.post(
  '/createCompany',
  upload, // Use upload middleware here
  authorizeAdmin,
  createCompany
);
companyRoutes.get('/getAllCompany', authenticateUser, getAllCompanies);
companyRoutes.get(
  '/getCompanyDetails/:companyId',
  authenticateUser,
  getCompanyById
);
companyRoutes.put(
  '/updateCompany',
  upload, // Use upload middleware here
  authorizeAdmin,
  updateCompany
);
companyRoutes.patch(
  '/updateDocument/:companyId',
  upload,
  authenticateUser,
  updateDocument
);
companyRoutes.delete('/deleteCompany/:id', authorizeAdmin, deleteCompany);
companyRoutes.post('/whatsapp', authorizeAdmin, async (req, res, next) => {
  try {
    const { companyId, whatsappPhoneId, whatsappToken } = req.body;

    if (!whatsappPhoneId || !whatsappToken || !companyId)
      return res.status(400).json({
        error: 'companyId and whatsappPhoneId, whatsappToken are required',
      });

    const conf = await setCompanyWhatsAppConfig(
      companyId,
      whatsappPhoneId,
      whatsappToken
    );
    res.json({ message: 'WhatsApp credentials updated', data: conf });
  } catch (err) {
    next(err);
  }
});

module.exports = companyRoutes;
