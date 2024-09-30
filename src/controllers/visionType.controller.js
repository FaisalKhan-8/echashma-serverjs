const db = require("../utils/db.config");

// Create a new vision type
const createVisionType = async (req, res) => {
  const { name } = req.body;

  try {
    const newVisionType = await db.visionType.create({
      data: { name },
    });
    res.status(201).json(newVisionType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create vision type" });
  }
};

// Get all vision types
const getAllVisionTypes = async (req, res) => {
  try {
    const visionTypes = await db.visionType.findMany();
    res.status(200).json(visionTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve vision types" });
  }
};

// Get a single vision type by ID
const getVisionTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const visionType = await db.visionType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!visionType) {
      return res.status(404).json({ error: "Vision type not found" });
    }

    res.status(200).json(visionType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve vision type" });
  }
};

// Update a vision type
const updateVisionType = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedVisionType = await db.visionType.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(updatedVisionType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update vision type" });
  }
};

// Delete a vision type
const deleteVisionType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.visionType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete vision type" });
  }
};

// Export the vision type controller functions
module.exports = {
  createVisionType,
  getAllVisionTypes,
  getVisionTypeById,
  updateVisionType,
  deleteVisionType,
};
