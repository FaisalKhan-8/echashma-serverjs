const { AppError } = require('../errors/AppError');
const db = require('../utils/db.config');

// Function to get all expenses with pagination and search
const getAllExpenses = async (req, res, next) => {
  const { role, companyId: userCompanyId } = req.user;
  const {
    page = 1,
    limit = 10,
    search = '',
    companyId: queryCompanyId,
  } = req.query;

  console.log(req.query, 'Queryyyyyyyyy');

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  try {
    // Define where condition based on role
    let whereCondition = {
      description: {
        contains: search,
      },
    };

    // Check if queryCompanyId is provided
    if (queryCompanyId) {
      whereCondition.companyId = Number(queryCompanyId) || undefined;
    } else if (role !== 'SUPER_ADMIN') {
      // For non-SUPER_ADMIN roles, use the companyId from the token
      if (!userCompanyId) {
        throw new AppError('No company associated with the user.', 400);
      }
      whereCondition.companyId = userCompanyId; // Filter by companyId for other roles
    }

    // Count the total expenses matching the condition
    const totalExpenses = await db.expense.count({
      where: whereCondition,
    });

    // Retrieve the expenses based on the condition and pagination
    const expenses = await db.expense.findMany({
      where: whereCondition,
      skip: (pageNumber - 1) * limitNumber,
      take: limitNumber,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        category: true, // Include category data in the result
        Company: true, // Include company data in the result using the correct relation
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
    next(error); // Pass the error to error-handling middleware
  }
};

// Function to create a new expense
const createExpense = async (req, res, next) => {
  const {
    amount,
    description,
    categoryId,
    companyId: selectedCompanyId,
  } = req.body;
  const { companyId: userCompanyId, role } = req.user; // Extract user-specific companyId from the token

  // Ensure amount and categoryId are provided
  if (!amount || !categoryId) {
    return res
      .status(400)
      .json({ error: 'Amount and category ID are required.' });
  }

  try {
    let companyId;

    // If the user is SUPER_ADMIN, they can either pass a companyId or leave it out
    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        // If SUPER_ADMIN passes a companyId in the request, use that
        companyId = selectedCompanyId;
      } else {
        // If no companyId is provided by SUPER_ADMIN, throw error
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating an expense',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create expense.',
          400
        );
      }
      companyId = userCompanyId; // Use the companyId from the user's token for non-SUPER_ADMIN
    }

    // Check if the expense category belongs to the same company (ensuring integrity)
    const category = await db.expenseCategory.findFirst({
      where: { id: categoryId, companyId },
    });

    if (!category) {
      throw new AppError('Invalid category ID for the selected company.', 400);
    }

    // Create the new expense with the correct companyId
    const newExpense = await db.expense.create({
      data: {
        amount,
        description: description || null,
        categoryId, // Ensure the expense is linked to the correct category
        companyId, // Attach the correct companyId to the expense
      },
    });

    res.status(201).json(newExpense);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the global error handler
  }
};

// Function to update an expense by ID
const updateExpense = async (req, res) => {
  const { id } = req.params;
  const { amount, description, categoryId } = req.body;

  try {
    const existingExpense = await db.expense.findUnique({
      where: { id: Number(id) },
      include: {
        category: true, // Include the related category
      },
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found.' });
    }

    const updatedExpense = await db.expense.update({
      where: { id: Number(id) },
      data: {
        amount,
        description,
        categoryId, // Update the category ID
      },
    });

    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: 'An error occurred while updating the expense.' });
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
      return res.status(404).json({ error: 'Expense not found.' });
    }

    await db.expense.delete({
      where: { id: Number(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: 'An error occurred while deleting the expense.' });
  }
};

// Export the controller functions
module.exports = {
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
};
