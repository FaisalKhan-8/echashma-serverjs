const { Router } = require("express");
const authRoutes = require("./auth.routes");
const companyRoutes = require("./companies.routes");
const branchRoutes = require("./branch.routes");

const rootRouter = Router();

rootRouter.use("/auth", authRoutes);
rootRouter.use("/company", companyRoutes);
rootRouter.use("/branch", branchRoutes);

module.exports = rootRouter;
