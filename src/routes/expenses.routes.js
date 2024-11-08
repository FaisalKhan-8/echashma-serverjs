const express = require('express');

const {
  createExpense,
  getAllExpenses,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenses.controller');
const authenticateUser = require('../middleware/authenticateUser');

const expensesRoutes = express.Router();

expensesRoutes.post('/create', authenticateUser, createExpense);
expensesRoutes.get('/getAll', authenticateUser, getAllExpenses);
expensesRoutes.put('/update/:id', authenticateUser, updateExpense);
expensesRoutes.delete('/delete/:id', authenticateUser, deleteExpense);

module.exports = expensesRoutes;
