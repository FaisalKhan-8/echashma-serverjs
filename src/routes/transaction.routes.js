const { Router } = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const validateRequest = require('../middleware/validateRequests');
const { purchaseMembershipSchema } = require('../schema/transaction');
const {
  purchaseMembership,
  pollPaymentStatus,
  findAll,
  findOne,
  downloadInvoice,
} = require('../controllers/transaction.controller');

const transactionRoutes = Router();

transactionRoutes.post(
  '/purchase-membership',
  authenticateUser,
  validateRequest(purchaseMembershipSchema),
  purchaseMembership
);

transactionRoutes.get('/', authenticateUser, findAll);
transactionRoutes.get(
  '/payment-status/:tx',
  authenticateUser,
  pollPaymentStatus
);
transactionRoutes.get('/:id/invoice', authenticateUser, downloadInvoice);
transactionRoutes.get('/:id', authenticateUser, findOne);

module.exports = transactionRoutes;
