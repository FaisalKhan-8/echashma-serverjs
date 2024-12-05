const { Router } = require('express');
const {
  CreateUser,
  Login,
  GetAllUser,
  UpdateUser,
  DeleteUser,
  GetLoggedInUser,
  GetRecentUsers,
} = require('../controllers/auth.controller'); // No need for '.js' in CommonJS
const authorizeAdmin = require('../middleware/authorizeAdmin');
const authenticateUser = require('../middleware/authenticateUser');

const authRoutes = Router();

authRoutes.post('/createUser', authenticateUser, CreateUser);
authRoutes.post('/login', Login);
authRoutes.get('/getAllUser', authenticateUser, GetAllUser);
authRoutes.get('/profile', authenticateUser, GetLoggedInUser);
authRoutes.get('/recent-users', authenticateUser, GetRecentUsers);
authRoutes.put('/update/:id', authenticateUser, UpdateUser);
authRoutes.delete('/delete/:id', authenticateUser, DeleteUser);

module.exports = authRoutes;
