const express = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const {
  getStock,
  getProductDetails,
  getInventoryProducts,
} = require('../controllers/inventory.controller');

const InventoryRoutes = express.Router();

InventoryRoutes.get(
  '/getInventoryProducts',
  authenticateUser,
  getInventoryProducts
);
InventoryRoutes.post('/stock', authenticateUser, getStock);
InventoryRoutes.post('/stockByProduct', authenticateUser, getProductDetails);
module.exports = InventoryRoutes;
