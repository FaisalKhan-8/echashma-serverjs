const express = require('express');

const {
  createShapeType,
  getAllShapeTypes,
  getShapeTypeById,
  updateShapeType,
  deleteShapeType,
} = require('../controllers/shapeType.controller');

const shapeTypeRoutes = express.Router();

shapeTypeRoutes.post('/create', authenticateUser, createShapeType);
shapeTypeRoutes.get('/getAll', authenticateUser, getAllShapeTypes);
shapeTypeRoutes.get('/get/:id', authenticateUser, getShapeTypeById);
shapeTypeRoutes.put('/update/:id', authenticateUser, updateShapeType);
shapeTypeRoutes.delete('/delete/:id', authenticateUser, deleteShapeType);

module.exports = shapeTypeRoutes;
