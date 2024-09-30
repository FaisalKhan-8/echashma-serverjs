const db = require("../utils/db.config");

// Create a new shape type
const createShapeType = async (req, res) => {
  const { name } = req.body;

  try {
    const newShapeType = await db.shapeType.create({
      data: { name },
    });
    res.status(201).json(newShapeType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create shape type" });
  }
};

// Get all shape types
const getAllShapeTypes = async (req, res) => {
  try {
    const shapeTypes = await db.shapeType.findMany();
    res.status(200).json(shapeTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve shape types" });
  }
};

// Get a single shape type by ID
const getShapeTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const shapeType = await db.shapeType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!shapeType) {
      return res.status(404).json({ error: "Shape type not found" });
    }

    res.status(200).json(shapeType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve shape type" });
  }
};

// Update a shape type
const updateShapeType = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedShapeType = await db.shapeType.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(updatedShapeType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update shape type" });
  }
};

// Delete a shape type
const deleteShapeType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.shapeType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete shape type" });
  }
};

// Export the shape type controller functions
module.exports = {
  createShapeType,
  getAllShapeTypes,
  getShapeTypeById,
  updateShapeType,
  deleteShapeType,
};
