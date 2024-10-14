const db = require('../utils/db.config')

// Create a new Expense Category
const createExpenseCategory = async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' })
  }

  try {
    const category = await db.expenseCategory.create({
      data: { name },
    })
    res.status(201).json(category)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create expense category' })
  }
}

// Get all Expense Categories
const getExpenseCategories = async (req, res) => {
  try {
    const categories = await db.expenseCategory.findMany()
    res.status(200).json(categories)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch expense categories' })
  }
}

// Update an Expense Category
const updateExpenseCategory = async (req, res) => {
  const { id } = req.params
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' })
  }

  try {
    const category = await db.expenseCategory.update({
      where: { id: parseInt(id) },
      data: { name },
    })
    res.status(200).json(category)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update expense category' })
  }
}

// Delete an Expense Category
const deleteExpenseCategory = async (req, res) => {
  const { id } = req.params

  try {
    await db.expenseCategory.delete({
      where: { id: parseInt(id) },
    })
    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete expense category' })
  }
}

// Export the controller functions using module.exports
module.exports = {
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  deleteExpenseCategory,
}
