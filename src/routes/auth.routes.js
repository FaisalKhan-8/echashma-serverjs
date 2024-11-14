const { Router } = require('express');
const {
  CreateUser,
  Login,
  GetAllUser,
  UpdateUser,
  DeleteUser,
  GetLoggedInUser,
} = require('../controllers/auth.controller'); // No need for '.js' in CommonJS
const authorizeAdmin = require('../middleware/authorizeAdmin');
const authenticateUser = require('../middleware/authenticateUser');

const authRoutes = Router();

authRoutes.post('/createUser', authorizeAdmin, CreateUser);
authRoutes.post('/login', Login);
authRoutes.get('/getAllUser', authorizeAdmin, GetAllUser);
authRoutes.get('/profile', authenticateUser, GetLoggedInUser);
authRoutes.put('/update/:id', authorizeAdmin, UpdateUser);
authRoutes.delete('/delete/:id', authorizeAdmin, DeleteUser);

module.exports = authRoutes;
