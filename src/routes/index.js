const { Router } = require("express");
const authRoutes = require("./auth.routes");
const companyRoutes = require("./companies.routes");

const rootRouter = Router();

rootRouter.use("/auth", authRoutes);
rootRouter.use("/web", companyRoutes);

module.exports = rootRouter;
