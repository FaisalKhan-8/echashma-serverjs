const { Router } = require('express');

const {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
  getBranchById,
} = require('../controllers/branch.controller');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const authenticateUser = require('../middleware/authenticateUser');

const branchRoutes = Router();

branchRoutes.post('/createBranch', authenticateUser, createBranch);
branchRoutes.get('/getBranch', authenticateUser, getBranches);
branchRoutes.get('/getBranch/:branchId', authenticateUser, getBranchById);
branchRoutes.put('/update/:id', authorizeAdmin, updateBranch);
branchRoutes.delete('/deleteBranch/:id', authorizeAdmin, deleteBranch);

module.exports = branchRoutes;
