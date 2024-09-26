const { Router } = require("express");

const { createBranch } = require("../controllers/branch.controller");

const branchRoutes = Router();

branchRoutes.post("/createBranch", createBranch);

module.exports = branchRoutes;
