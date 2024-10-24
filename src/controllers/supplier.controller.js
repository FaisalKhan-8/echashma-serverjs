const db = require('../utils/db.config')

// Create a new supplier
const createSupplier = async (req, res) => {
  const { code, name, address, contactPerson, contactNo, email, gstin, uin } =
    req.body

  try {
    const newSupplier = await db.supplier.create({
      data: {
        code,
        name,
        address,
        contactPerson,
        contactNo,
        email,
        gstin,
        uin,
      },
    })
    res.status(201).json(newSupplier)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to create supplier' })
  }
}

// Get all suppliers with pagination and search
const getAllSuppliers = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query
  const pageNumber = parseInt(page)
  const pageLimit = parseInt(limit)

  try {
    const suppliers = await db.supplier.findMany({
      where: {
        name: {
          contains: search, // Remove the mode property
        },
      },
      skip: (pageNumber - 1) * pageLimit,
      take: pageLimit,
    })

    const totalSuppliers = await db.supplier.count({
      where: {
        name: {
          contains: search, // Remove the mode property
        },
      },
    })

    res.status(200).json({
      totalSuppliers,
      totalPages: Math.ceil(totalSuppliers / pageLimit),
      currentPage: pageNumber,
      suppliers,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to retrieve suppliers' })
  }
}

// Get a single supplier by ID
const getSupplierById = async (req, res) => {
  const { id } = req.params

  try {
    const supplier = await db.supplier.findUnique({
      where: { id: parseInt(id) },
    })

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' })
    }

    res.status(200).json(supplier)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to retrieve supplier' })
  }
}

// Update a supplier
const updateSupplier = async (req, res) => {
  const { id } = req.params
  const { code, name, address, contactPerson, contactNo, email, gstin, uin } =
    req.body

  try {
    const updatedSupplier = await db.supplier.update({
      where: { id: parseInt(id) },
      data: {
        code,
        name,
        address,
        contactPerson,
        contactNo,
        email,
        gstin,
        uin,
      },
    })
    res.status(200).json(updatedSupplier)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to update supplier' })
  }
}

// Delete a supplier
const deleteSupplier = async (req, res) => {
  const { id } = req.params

  try {
    await db.supplier.delete({
      where: { id: parseInt(id) },
    })
    res.status(204).send() // No content to return after deletion
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to delete supplier' })
  }
}

// Export the supplier controller functions
module.exports = {
  createSupplier,
  getAllSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
}
