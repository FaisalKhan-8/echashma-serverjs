const express = require("express");

const {
  createShapeType,
  getAllShapeTypes,
  getShapeTypeById,
  updateShapeType,
  deleteShapeType,
} = require("../controllers/shapeType.controller");

const shapeTypeRoutes = express.Router();

shapeTypeRoutes.post("/create", createShapeType);
shapeTypeRoutes.get("/getAll", getAllShapeTypes);
shapeTypeRoutes.get("/get/:id", getShapeTypeById);
shapeTypeRoutes.put("/update/:id", updateShapeType);
shapeTypeRoutes.delete("/delete/:id", deleteShapeType);

module.exports = shapeTypeRoutes;
