"use strict";

var _require = require("express"),
  Router = _require.Router;
var _require2 = require("../controllers/auth.controller"),
  CreateUser = _require2.CreateUser,
  Login = _require2.Login; // No need for '.js' in CommonJS
var authorizeAdmin = require("../middleware/authorizeAdmin");
var authRoutes = Router();
authRoutes.post("/create-user", authorizeAdmin, CreateUser);
authRoutes.post("/login", Login);
module.exports = authRoutes;