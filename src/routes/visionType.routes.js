const express = require('express');

const {
  createVisionType,
  getAllVisionTypes,
  getVisionTypeById,
  updateVisionType,
  deleteVisionType,
} = require('../controllers/visionType.controller');
const authenticateUser = require('../middleware/authenticateUser');

const visionTypeRoutes = express.Router();

visionTypeRoutes.post('/create', authenticateUser, createVisionType);
visionTypeRoutes.get('/getAll', authenticateUser, getAllVisionTypes);
visionTypeRoutes.get('/get/:id', authenticateUser, getVisionTypeById);
visionTypeRoutes.put('/update/:id', authenticateUser, updateVisionType);
visionTypeRoutes.delete('/delete/:id', authenticateUser, deleteVisionType);

module.exports = visionTypeRoutes;
