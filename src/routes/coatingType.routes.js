const express = require('express');

const {
  createCoatingType,
  getAllCoatingTypes,
  getCoatingTypeById,
  updateCoatingType,
  deleteCoatingType,
} = require('../controllers/coatingType.controller');
const authenticateUser = require('../middleware/authenticateUser');

const coatingTypeRoutes = express.Router();

coatingTypeRoutes.post('/create', authenticateUser, createCoatingType);
coatingTypeRoutes.get('/getAll', authenticateUser, getAllCoatingTypes);
coatingTypeRoutes.get('/get/:id', authenticateUser, getCoatingTypeById);
coatingTypeRoutes.put('/update/:id', authenticateUser, updateCoatingType);
coatingTypeRoutes.delete('/delete/:id', authenticateUser, deleteCoatingType);

module.exports = coatingTypeRoutes;
