const db = require("../utils/db.config");

// Function to get all expenses with pagination and search
const getAllExpenses = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  try {
    const totalExpenses = await db.expense.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    const expenses = await db.expense.findMany({
      where: {
        name: {
          contains: search,
        },
      },
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      orderBy: {
        created_at: "desc",
      },
    });

    res.json({
      total: totalExpenses,
      page: pageNumber,
      limit: limitNumber,
      data: expenses,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving expenses." });
  }
};

// Function to create a new expense
const createExpense = async (req, res) => {
  const { name, amount, description } = req.body;

  if (!name || !amount) {
    return res.status(400).json({ error: "Name and amount are required." });
  }

  try {
    const newExpense = await db.expense.create({
      data: {
        name,
        amount,
        description,
      },
    });

    res.status(201).json(newExpense);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while creating the expense." });
  }
};

// Function to update an expense by ID
const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { name, amount, description } = req.body;

  try {
    const existingExpense = await db.expense.findUnique({
      where: { id: Number(id) },
    });
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    const updatedExpense = await db.expense.update({
      where: { id: Number(id) },
      data: {
        name,
        amount,
        description,
      },
    });

    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the expense." });
  }
};

// Function to delete an expense by ID
const deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    const existingExpense = await db.expense.findUnique({
      where: { id: Number(id) },
    });
    if (!existingExpense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    await db.expense.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the expense." });
  }
};

// Export the controller functions
module.exports = {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
