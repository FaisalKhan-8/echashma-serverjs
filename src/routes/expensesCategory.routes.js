const express = require('express')
const {
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
} = require('../controllers/ExpenseCategory.controller')
const expenseCategoryRoutes = express.Router()

expenseCategoryRoutes.post('/', createExpenseCategory)

expenseCategoryRoutes.get('/', getExpenseCategories)

expenseCategoryRoutes.put('/:id', updateExpenseCategory)

expenseCategoryRoutes.delete('/:id', deleteExpenseCategory)

module.exports = expenseCategoryRoutes
