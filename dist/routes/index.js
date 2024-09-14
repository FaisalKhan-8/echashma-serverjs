"use strict";

var _require = require("express"),
  Router = _require.Router;
var authRoutes = require("./auth.routes");
var rootRouter = Router();
rootRouter.use("/auth", authRoutes);
module.exports = rootRouter;