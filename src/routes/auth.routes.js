const { Router } = require("express");
const {
  CreateUser,
  Login,
  GetAllUser,
  UpdateUser,
} = require("../controllers/auth.controller"); // No need for '.js' in CommonJS
const authorizeAdmin = require("../middleware/authorizeAdmin");

const authRoutes = Router();

authRoutes.post("/createUser", authorizeAdmin, CreateUser);
authRoutes.post("/login", Login);
authRoutes.get("/getAllUser", authorizeAdmin, GetAllUser);
authRoutes.put("/updateUser", authorizeAdmin, UpdateUser);

module.exports = authRoutes;
