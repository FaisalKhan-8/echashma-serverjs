const express = require("express");
const {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");
const { getAllCompanies } = require("../controllers/companies.controller");

const ProductRoutes = express.Router();

ProductRoutes.post("/add", createProduct);
ProductRoutes.get("/getAll", getAllCompanies);
ProductRoutes.get("/get/:id", getProductById);
ProductRoutes.put("/update/:id", updateProduct);
ProductRoutes.delete("/delete/:id", deleteProduct);

module.exports = ProductRoutes;
