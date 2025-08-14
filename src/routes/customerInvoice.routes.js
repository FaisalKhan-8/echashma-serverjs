const express = require('express');
const {
  createCustomerInvoice,
  updateCustomerInvoice,
  getAllCustomerInvoices,
  getCustomerInvoiceById,
  verifyPhone,
  getInvoice,
} = require('../controllers/customerInvoice.controller');
const authenticateUser = require('../middleware/authenticateUser');

const customerInvoiceRoutes = express.Router();

customerInvoiceRoutes.post('/create', authenticateUser, createCustomerInvoice);
customerInvoiceRoutes.post('/verify-phone', verifyPhone);
customerInvoiceRoutes.get('/verified-invoice/:id', getInvoice);
customerInvoiceRoutes.get('/getAll', authenticateUser, getAllCustomerInvoices);
customerInvoiceRoutes.get('/get/:id', authenticateUser, getCustomerInvoiceById);
customerInvoiceRoutes.put(
  '/update/:id',
  authenticateUser,
  updateCustomerInvoice
);

// customerInvoiceRoutes.delete(
//   '/delete/:id',
//   authenticateUser,
//   deleteCustomerInvoice
// );

module.exports = customerInvoiceRoutes;
