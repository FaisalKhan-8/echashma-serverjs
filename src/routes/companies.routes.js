const { Router } = require('express');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const {
  createCompany,
  upload, // Import upload here
  getAllCompanies,
  updateCompany,
  deleteCompany,
  getCompanyById,
  updateDocument,
  setCompanyWhatsAppConfig,
} = require('../controllers/companies.controller');
const authenticateUser = require('../middleware/authenticateUser');

const companyRoutes = Router();

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
