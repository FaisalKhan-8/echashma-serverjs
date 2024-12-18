const express = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const { getStock } = require('../controllers/inventory.controller');

const InventoryRoutes = express.Router();

InventoryRoutes.post('/stock', authenticateUser, getStock);

module.exports = InventoryRoutes;
