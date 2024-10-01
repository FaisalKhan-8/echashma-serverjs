const db = require("../utils/db.config");

// Create a new coating type
const createCoatingType = async (req, res) => {
  const { code, name } = req.body;

  try {
    const newCoatingType = await db.coatingType.create({
      data: { code, name },
    });
    res.status(201).json(newCoatingType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create coating type" });
  }
};

// Get all coating types with pagination and search
const getAllCoatingTypes = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const skip = (page - 1) * limit;
  const take = parseInt(limit);

  try {
    const coatingTypes = await db.coatingType.findMany({
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
    const totalCount = await db.coatingType.count({
      where: {
        name: {
          contains: search,
        },
      },
    });

    res.status(200).json({
      coatingTypes,
      totalCount,
      totalPages: Math.ceil(totalCount / take),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve coating types" });
  }
};

// Get a single coating type by ID
const getCoatingTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const coatingType = await db.coatingType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!coatingType) {
      return res.status(404).json({ error: "Coating type not found" });
    }

    res.status(200).json(coatingType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve coating type" });
  }
};

// Update a coating type
const updateCoatingType = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  try {
    const updatedCoatingType = await db.coatingType.update({
      where: { id: parseInt(id) },
      data: { code, name },
    });
    res.status(200).json(updatedCoatingType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update coating type" });
  }
};

// Delete a coating type
const deleteCoatingType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.coatingType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete coating type" });
  }
};

// Export the coating type controller functions
module.exports = {
  createCoatingType,
  getAllCoatingTypes,
  getCoatingTypeById,
  updateCoatingType,
  deleteCoatingType,
};
