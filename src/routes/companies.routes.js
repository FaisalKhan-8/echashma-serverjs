const { Router } = require('express');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const {
  createCompany,
  upload, // Import upload here
  getAllCompanies,
  updateCompany,
  deleteCompany,
} = require('../controllers/companies.controller');

const companyRoutes = Router();

companyRoutes.post(
  '/createCompany',
  upload, // Use upload middleware here
  authorizeAdmin,
  createCompany
);
companyRoutes.get('/getAllCompany', authorizeAdmin, getAllCompanies);
companyRoutes.put(
  '/updateCompany',
  upload, // Use upload middleware here
  authorizeAdmin,
  updateCompany
);
companyRoutes.delete('/deleteCompany/:id', authorizeAdmin, deleteCompany);

module.exports = companyRoutes;
