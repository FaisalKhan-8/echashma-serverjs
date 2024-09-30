const express = require("express");
const {
  addProduct,
  getAllProductsByType,
} = require("../controllers/product.controller");

const ProductRoutes = express.Router();

ProductRoutes.post("/add", addProduct);
ProductRoutes.get("/getAll", getAllProductsByType);

module.exports = ProductRoutes;
