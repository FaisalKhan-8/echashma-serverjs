const db = require('../utils/db.config');
const { AppError } = require('../errors/AppError.js');

// Create a new Expense Category
const createExpenseCategory = async (req, res, next) => {
  const { name } = req.body;
  const { companyId: userCompanyId, role } = req.user; // Extract user-specific companyId from the token
  const { companyId: selectedCompanyId } = req.query;

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    let companyId;

    // If the user is SUPER_ADMIN, they can either pass a companyId or leave it out
    if (role === 'SUPER_ADMIN') {
      if (selectedCompanyId) {
        // If SUPER_ADMIN passes a companyId in the request, use that
        companyId = parseInt(selectedCompanyId, 10);
      } else {
        // If no companyId is provided by SUPER_ADMIN, throw error
        throw new AppError(
          'SUPER_ADMIN must provide a companyId when creating an expense category if no company is selected',
          400
        );
      }
    } else {
      // For non-SUPER_ADMIN users (like ADMIN), use the companyId from the token
      if (!userCompanyId) {
        throw new AppError(
          'No company associated with the user. Cannot create expense category.',
          400
        );
      }
      companyId = userCompanyId; // Use the companyId from the user's token for non-SUPER_ADMIN
    }

    // Check if the category with the same name already exists for the given company
    const existingCategory = await db.expenseCategory.findFirst({
      where: {
        AND: [
          { companyId }, // Ensure the expense category is created for the correct company
          { name }, // Check for existing name
        ],
      },
    });

    if (existingCategory) {
      throw new AppError(
        'Expense category with this name already exists.',
        400
      );
    }

    // Create the new expense category with the correct companyId
    const category = await db.expenseCategory.create({
      data: { name, companyId }, // Use the selected or user-specific companyId
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the global error handler
  }
};

// Get all Expense Categories
const getExpenseCategories = async (req, res, next) => {
  const { role, companyId: userCompanyId } = req.user; // Get role and companyId from user token
  const { companyId: queryCompanyId } = req.query; // Get companyId from query parameters

  try {
    // Define where condition based on role
    let whereCondition = {};

    if (role === 'SUPER_ADMIN') {
      // For SUPER_ADMIN, check if companyId is provided in the query
      if (queryCompanyId) {
        whereCondition.companyId = parseInt(queryCompanyId, 10) || undefined; // Filter categories by companyId from query
      }
    } else {
      // For non-SUPER_ADMIN roles, restrict categories to the user's companyId
      if (!userCompanyId) {
        throw new AppError('No company associated with the user.', 400);
      }
      whereCondition.companyId = userCompanyId; // Filter categories by companyId from user token
    }

    // Fetch categories based on the condition and include the associated company
    const categories = await db.expenseCategory.findMany({
      where: whereCondition,
      include: {
        Company: true, // Include the related company for each category
      },
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to error-handling middleware
  }
};

// Update an Expense Category
const updateExpenseCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const category = await db.expenseCategory.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update expense category' });
  }
};

// Delete an Expense Category
const deleteExpenseCategory = async (req, res) => {
  const { id } = req.params;

  try {
    await db.expenseCategory.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete expense category' });
  }
};

// Export the controller functions using module.exports
module.exports = {
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
};
