const { Router } = require("express");
const authorizeAdmin = require("../middleware/authorizeAdmin");
const { createCompany } = require("../controllers/companies.controller");

const companyRoutes = Router();

companyRoutes.post("/createCompany", authorizeAdmin, createCompany);

module.exports = companyRoutes;
