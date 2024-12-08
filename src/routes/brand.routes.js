const express = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const {
  createBrand,
  getAllBrand,
  getBrandById,
  updateBrand,
  deleteBrand,
} = require('../controllers/Brand.controller');

const BrandRoutes = express.Router();

BrandRoutes.post('/create', authenticateUser, createBrand);
BrandRoutes.get('/getAll', authenticateUser, getAllBrand);
BrandRoutes.get('/get/:id', authenticateUser, getBrandById);
BrandRoutes.put('/update/:id', authenticateUser, updateBrand);
BrandRoutes.delete('/delete/:id', authenticateUser, deleteBrand);

module.exports = BrandRoutes;
