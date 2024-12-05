const { Router } = require('express');

const {
  createBranch,
  getBranches,
  updateBranch,
  deleteBranch,
} = require('../controllers/branch.controller');
const authorizeAdmin = require('../middleware/authorizeAdmin');
const authenticateUser = require('../middleware/authenticateUser');

const branchRoutes = Router();

branchRoutes.post('/createBranch', authenticateUser, createBranch);
branchRoutes.get('/getBranch', authenticateUser, getBranches);
branchRoutes.put('/update/:id', authorizeAdmin, updateBranch);
branchRoutes.delete('/deleteBranch/:id', authorizeAdmin, deleteBranch);

module.exports = branchRoutes;
