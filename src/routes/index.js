const { Router } = require("express");
const authRoutes = require("./auth.routes");

const rootRouter = Router();

rootRouter.use("/auth", authRoutes);

module.exports = rootRouter;
