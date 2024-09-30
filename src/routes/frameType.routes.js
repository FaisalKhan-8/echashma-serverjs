const express = require("express");

const {
  createFrameType,
  getAllFrameTypes,
  getFrameTypeById,
  updateFrameType,
  deleteFrameType,
} = require("../controllers/frameType.controller");

const frameTypeRoutes = express.Router();

frameTypeRoutes.post("/create", createFrameType);
frameTypeRoutes.get("/getAll", getAllFrameTypes);
frameTypeRoutes.get("/get/:id", getFrameTypeById);
frameTypeRoutes.put("/update/:id", updateFrameType);
frameTypeRoutes.delete("/delete/:id", deleteFrameType);

module.exports = frameTypeRoutes;
