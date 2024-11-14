const express = require('express');
const {
  createPurchase,
  updatePurchase,
  getAllPurchases,
  getPurchaseById,
  deletePurchase,
} = require('../controllers/purchase.controller');
const authenticateUser = require('../middleware/authenticateUser');
const PurchaseRoutes = express.Router();

PurchaseRoutes.post('/', authenticateUser, createPurchase);
PurchaseRoutes.put('/:id', authenticateUser, updatePurchase);
PurchaseRoutes.get('/', authenticateUser, getAllPurchases);
PurchaseRoutes.get('/:id', authenticateUser, getPurchaseById);
PurchaseRoutes.delete('/:purchaseId', authenticateUser, deletePurchase);

module.exports = PurchaseRoutes;
