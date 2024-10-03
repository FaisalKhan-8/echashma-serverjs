const { Router } = require("express");
const {
  CreateUser,
  Login,
  GetAllUser,
  UpdateUser,
} = require("../controllers/auth.controller"); // No need for '.js' in CommonJS
const authorizeAdmin = require("../middleware/authorizeAdmin");

const authRoutes = Router();

// TODO: update user by id and get single by id

authRoutes.post("/createUser", CreateUser);
authRoutes.post("/login", Login);
authRoutes.get("/getAllUser", authorizeAdmin, GetAllUser);
authRoutes.put("/updateUser", authorizeAdmin, UpdateUser);

module.exports = authRoutes;
