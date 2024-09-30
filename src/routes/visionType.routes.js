const express = require("express");

const {
  createVisionType,
  getAllVisionTypes,
  getVisionTypeById,
  updateVisionType,
  deleteVisionType,
} = require("../controllers/visionType.controller");

const visionTypeRoutes = express.Router();

visionTypeRoutes.post("/create", createVisionType);
visionTypeRoutes.get("/getAll", getAllVisionTypes);
visionTypeRoutes.get("/get/:id", getVisionTypeById);
visionTypeRoutes.put("/update/:id", updateVisionType);
visionTypeRoutes.delete("/delete/:id", deleteVisionType);

module.exports = visionTypeRoutes;
