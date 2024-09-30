const express = require("express");

const {
  createCoatingType,
  getAllCoatingTypes,
  getCoatingTypeById,
  updateCoatingType,
  deleteCoatingType,
} = require("../controllers/coatingType.controller");

const coatingTypeRoutes = express.Router();

coatingTypeRoutes.post("/create", createCoatingType);
coatingTypeRoutes.get("/getAll", getAllCoatingTypes);
coatingTypeRoutes.get("/get/:id", getCoatingTypeById);
coatingTypeRoutes.put("/update/:id", updateCoatingType);
coatingTypeRoutes.delete("/delete/:id", deleteCoatingType);

module.exports = coatingTypeRoutes;
