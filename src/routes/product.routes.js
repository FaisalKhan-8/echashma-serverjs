const express = require('express');
const {
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByUserBranches,
  getAllProducts,
} = require('../controllers/product.controller');
const { getAllCompanies } = require('../controllers/companies.controller');
const authenticateUser = require('../middleware/authenticateUser');

const ProductRoutes = express.Router();

ProductRoutes.post('/add', authenticateUser, createProduct);
ProductRoutes.get('/getAll', authenticateUser, getAllProducts);
ProductRoutes.get('/get/:id', authenticateUser, getProductById);
ProductRoutes.put('/update/:id', authenticateUser, updateProduct);
ProductRoutes.delete('/delete/:id', authenticateUser, deleteProduct);

// New route for fetching products by user branches
ProductRoutes.get('/user/:userId', authenticateUser, getProductsByUserBranches);

module.exports = ProductRoutes;
