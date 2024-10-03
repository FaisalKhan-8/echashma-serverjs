const { Router } = require("express");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const {
  createCompany,
  upload,
  getAllCompanies,
  updateCompany,
  deleteCompany,
} = require("../controllers/companies.controller");

const companyRoutes = Router();

companyRoutes.post(
  "/createCompany",
  upload.fields([
    { name: "pancard", maxCount: 1 },
    { name: "aadhaarcard", maxCount: 1 },
  ]),
  authorizeAdmin,
  createCompany
);
companyRoutes.get("/getAllCompany", authorizeAdmin, getAllCompanies);
companyRoutes.put(
  "/updateCompany",
  upload.fields([
    { name: "pancard", maxCount: 1 },
    { name: "aadhaarcard", maxCount: 1 },
  ]),
  authorizeAdmin,
  updateCompany
);
companyRoutes.delete("/deleteCompany/:id", authorizeAdmin, deleteCompany);

module.exports = companyRoutes;
