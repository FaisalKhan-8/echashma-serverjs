const db = require("../utils/db.config");

// Create a new frame type
const createFrameType = async (req, res) => {
  const { name } = req.body;

  try {
    const newFrameType = await db.frameType.create({
      data: { name },
    });
    res.status(201).json(newFrameType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to create frame type" });
  }
};

// Get all frame types
const getAllFrameTypes = async (req, res) => {
  try {
    const frameTypes = await db.frameType.findMany();
    res.status(200).json(frameTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve frame types" });
  }
};

// Get a single frame type by ID
const getFrameTypeById = async (req, res) => {
  const { id } = req.params;

  try {
    const frameType = await db.frameType.findUnique({
      where: { id: parseInt(id) },
    });

    if (!frameType) {
      return res.status(404).json({ error: "Frame type not found" });
    }

    res.status(200).json(frameType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to retrieve frame type" });
  }
};

// Update a frame type
const updateFrameType = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedFrameType = await db.frameType.update({
      where: { id: parseInt(id) },
      data: { name },
    });
    res.status(200).json(updatedFrameType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to update frame type" });
  }
};

// Delete a frame type
const deleteFrameType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.frameType.delete({
      where: { id: parseInt(id) },
    });
    res.status(204).send(); // No content to return after deletion
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Unable to delete frame type" });
  }
};

// Export the frame type controller functions
module.exports = {
  createFrameType,
  getAllFrameTypes,
  getFrameTypeById,
  updateFrameType,
  deleteFrameType,
};
