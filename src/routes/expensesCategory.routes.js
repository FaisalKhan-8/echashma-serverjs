const express = require('express');
const {
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
} = require('../controllers/ExpenseCategory.controller');
const authenticateUser = require('../middleware/authenticateUser');
const expenseCategoryRoutes = express.Router();

expenseCategoryRoutes.post('/', authenticateUser, createExpenseCategory);

expenseCategoryRoutes.get('/', authenticateUser, getExpenseCategories);

expenseCategoryRoutes.put('/:id', authenticateUser, updateExpenseCategory);

expenseCategoryRoutes.delete('/:id', authenticateUser, deleteExpenseCategory);

module.exports = expenseCategoryRoutes;
