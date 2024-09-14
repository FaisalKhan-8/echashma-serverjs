const { Router } = require("express");
const { CreateUser, Login } = require("../controllers/auth.controller"); // No need for '.js' in CommonJS
const authorizeAdmin = require("../middleware/authorizeAdmin");

const authRoutes = Router();

authRoutes.post("/createUser", authorizeAdmin, CreateUser);
authRoutes.post("/login", Login);

module.exports = authRoutes;
