const express = require('express');
const {
  createCustomerInvoice,
  getAllCustomerInvoices,
  updateCustomerInvoice,
  deleteCustomerInvoice,
} = require('../controllers/customerInvoice.controller');
const authenticateUser = require('../middleware/authenticateUser');

const customerInvoiceRoutes = express.Router();

customerInvoiceRoutes.post('/create', authenticateUser, createCustomerInvoice);
customerInvoiceRoutes.get('/getAll', authenticateUser, getAllCustomerInvoices);
customerInvoiceRoutes.put(
  '/update/:id',
  authenticateUser,
  updateCustomerInvoice
);
customerInvoiceRoutes.delete(
  '/delete/:id',
  authenticateUser,
  deleteCustomerInvoice
);

module.exports = customerInvoiceRoutes;
