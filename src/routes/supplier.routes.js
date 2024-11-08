const express = require('express');
const {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} = require('../controllers/supplier.controller');

const supplierRoutes = express.Router();

supplierRoutes.post('/create', authenticateUser, createSupplier);
supplierRoutes.get('/getAll', authenticateUser, getAllSuppliers);
supplierRoutes.get('/get/:id', authenticateUser, getSupplierById);
supplierRoutes.put('/update/:id', authenticateUser, updateSupplier);
supplierRoutes.delete('/delete/:id', authenticateUser, deleteSupplier);

module.exports = supplierRoutes;
