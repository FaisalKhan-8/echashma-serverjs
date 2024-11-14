const express = require('express');

const {
  createFrameType,
  getAllFrameTypes,
  getFrameTypeById,
  updateFrameType,
  deleteFrameType,
} = require('../controllers/frameType.controller');
const authenticateUser = require('../middleware/authenticateUser');

const frameTypeRoutes = express.Router();

frameTypeRoutes.post('/create', authenticateUser, createFrameType);
frameTypeRoutes.get('/getAll', authenticateUser, getAllFrameTypes);
frameTypeRoutes.get('/get/:id', authenticateUser, getFrameTypeById);
frameTypeRoutes.put('/update/:id', authenticateUser, updateFrameType);
frameTypeRoutes.delete('/delete/:id', authenticateUser, deleteFrameType);

module.exports = frameTypeRoutes;
