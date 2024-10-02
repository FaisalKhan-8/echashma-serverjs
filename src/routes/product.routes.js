const express = require("express");
const {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByUserBranches,
  getAllProducts,
} = require("../controllers/product.controller");
const { getAllCompanies } = require("../controllers/companies.controller");

const ProductRoutes = express.Router();

ProductRoutes.post("/add", createProduct);
ProductRoutes.get("/getAll", getAllProducts);
ProductRoutes.get("/get/:id", getProductById);
ProductRoutes.put("/update/:id", updateProduct);
ProductRoutes.delete("/delete/:id", deleteProduct);

// New route for fetching products by user branches
ProductRoutes.get("/user/:userId", getProductsByUserBranches);

module.exports = ProductRoutes;
