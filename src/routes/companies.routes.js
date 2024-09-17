const { Router } = require("express");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const {
  createCompany,
  upload,
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

module.exports = companyRoutes;
