const { Router } = require("express");
const {
  CreateUser,
  Login,
  GetAllUser,
  UpdateUser,
  DeleteUser,
} = require("../controllers/auth.controller"); // No need for '.js' in CommonJS
const authorizeAdmin = require("../middleware/authorizeAdmin");

const authRoutes = Router();

authRoutes.post("/createUser", CreateUser);
authRoutes.post("/login", Login);
authRoutes.get("/getAllUser", authorizeAdmin, GetAllUser);
authRoutes.put("/update/:id", authorizeAdmin, UpdateUser);
authRoutes.delete("/delete/:id", authorizeAdmin, DeleteUser);

module.exports = authRoutes;
