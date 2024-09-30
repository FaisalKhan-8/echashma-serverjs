const express = require("express");
const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplier.controller");

const supplierRoutes = express.Router();

supplierRoutes.post("/create", createSupplier);
supplierRoutes.get("/getAll", getAllSuppliers);
supplierRoutes.get("/get/:id", getSupplierById);
supplierRoutes.put("/update/:id", updateSupplier);
supplierRoutes.delete("/delete/:id", deleteSupplier);

module.exports = supplierRoutes;
