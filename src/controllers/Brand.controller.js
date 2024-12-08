const db = require('../utils/db.config');

// Create a new coating type
const createBrand = async (req, res) => {
  const { code, name } = req.body;

  try {
    const existingBrand = await db.brands.findUnique({
      where: { code },
    });

    if (existingBrand) {
      return res.status(400).json({ error: 'Brand code already exists' });
    }

    const newBrand = await db.brands.create({
      data: { code, name },
    });

    res.status(201).json(newBrand);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create Brand' });
  }
};

// Get all coating types with pagination and search
const getAllBrand = async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  try {
    const Brands = await db.brands.findMany({
      where: {
        name: {
          contains: search,
          // Add 'mode: 'insensitive'' for case insensitive search if using PostgreSQL
        },
      },
      skip: skip,
      take: take,
    });

    // Get the total count of coating types for pagination
    const totalCount = await db.brands.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    res.status(200).json({
      Brands,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve Brand' });
  }
};

// Get a single coating type by ID
const getBrandById = async (req, res) => {
  const { id } = req.params;

  try {
    const Brand = await db.brands.findUnique({
      where: { id: parseInt(id) },
    });

    if (!Brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.status(200).json(Brand);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to retrieve Brand' });
  }
};

// Update a coating type
const updateBrand = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  try {
    const updatedBrand = await db.brands.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });
    res.status(200).json(updatedBrand);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update Brand' });
  }
};

// Delete a coating type
const deleteBrand = async (req, res) => {
  const { id } = req.params;

  try {
    await db.brands.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to delete Brand' });
  }
};

// Export the coating type controller functions
module.exports = {
  createBrand,
  getAllBrand,
  getBrandById,
  updateBrand,
  deleteBrand,
};
