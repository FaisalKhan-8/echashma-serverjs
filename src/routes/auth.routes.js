const { Router } = require('express');
const {
  CreateUser,
  Login,
  GetAllUser,
  UpdateUser,
  DeleteUser,
  GetLoggedInUser,
  GetRecentUsers,
  CreateFirstAdmin,
  ForgetPass,
  ResetPassword,
} = require('../controllers/auth.controller'); // No need for '.js' in CommonJS
const authorizeAdmin = require('../middleware/authorizeAdmin');
const authenticateUser = require('../middleware/authenticateUser');
const upload = require('../middleware/upload');

const authRoutes = Router();

authRoutes.post('/createUser', upload, authenticateUser, CreateUser);
authRoutes.post('/admin/first', CreateFirstAdmin);
authRoutes.post('/login', Login);
authRoutes.post('/forgot-password', ForgetPass);
authRoutes.post('/reset-password', ResetPassword);
authRoutes.get('/getAllUser', authenticateUser, GetAllUser);
authRoutes.get('/profile', authenticateUser, GetLoggedInUser);
authRoutes.get('/recent-users', authenticateUser, GetRecentUsers);
authRoutes.put('/update/:id', authenticateUser, UpdateUser);
authRoutes.delete('/delete/:id', authenticateUser, DeleteUser);

module.exports = authRoutes;
