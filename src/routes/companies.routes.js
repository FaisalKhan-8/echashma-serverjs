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

module.exports = companyRoutes;
