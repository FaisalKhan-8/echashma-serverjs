const express = require("express");

const {
  createExpense,
  getAllExpenses,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenses.controller");

const expensesRoutes = express.Router();

expensesRoutes.post("/create", createExpense);
expensesRoutes.get("/getAll", getAllExpenses);
expensesRoutes.put("/update/:id", updateExpense);
expensesRoutes.delete("/delete/:id", deleteExpense);

module.exports = expensesRoutes;
