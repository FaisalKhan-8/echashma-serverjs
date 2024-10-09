const express = require('express');
const {
  createPurchase,
  updatePurchase,
  getAllPurchases,
  getPurchaseById,
  deletePurchase,
} = require('../controllers/purchase.controller');
const PurchaseRoutes = express.Router();

PurchaseRoutes.post('/', createPurchase);
PurchaseRoutes.put('/:id', updatePurchase);
PurchaseRoutes.get('/', getAllPurchases);
PurchaseRoutes.get('/:id', getPurchaseById);
PurchaseRoutes.delete('/:purchaseId', deletePurchase);

module.exports = PurchaseRoutes;
