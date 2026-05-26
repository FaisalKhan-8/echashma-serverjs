const { Router } = require('express');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const validateRequest = require('../middleware/validateRequests');
const {
  createMembershipPlanSchema,
  updateMembershipPlanSchema,
  grantDemoTrialSchema,
} = require('../schema/membershipPlan');
const {
  getAllMembershipPlans,
  getMembershipPlanById,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  grantDemoTrial,
} = require('../controllers/membershipPlan.controller');

const membershipPlanRoutes = Router();

membershipPlanRoutes.get('/', getAllMembershipPlans);

membershipPlanRoutes.post(
  '/demo-trial',
  authorizeAdmin,
  validateRequest(grantDemoTrialSchema),
  grantDemoTrial
);

membershipPlanRoutes.get('/:id', getMembershipPlanById);

membershipPlanRoutes.post(
  '/',
  authorizeAdmin,
  validateRequest(createMembershipPlanSchema),
  createMembershipPlan
);

membershipPlanRoutes.patch(
  '/:id',
  authorizeAdmin,
  validateRequest(updateMembershipPlanSchema),
  updateMembershipPlan
);

membershipPlanRoutes.delete('/:id', authorizeAdmin, deleteMembershipPlan);

module.exports = membershipPlanRoutes;
