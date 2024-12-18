const express = require('express');
const {
  createPrescription,
  getAllPrescriptions,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescription.controller');
const authenticateUser = require('../middleware/authenticateUser');

const prescriptionRoutes = express.Router();

prescriptionRoutes.post('/create', authenticateUser, createPrescription);
prescriptionRoutes.get('/getAll', authenticateUser, getAllPrescriptions);
// prescriptionRoutes.put('/update/:id', authenticateUser, updatePrescription);
// prescriptionRoutes.delete('/delete/:id', authenticateUser, deletePrescription);

module.exports = prescriptionRoutes;
