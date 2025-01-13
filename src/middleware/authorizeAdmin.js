const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../errors/AppError'); // No need to add '.js' extension in CommonJS

const prisma = new PrismaClient();

const authorizeAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError('Unauthorized User', 401));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(new AppError('Unauthorized User', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (user && user.role === 'SUPER_ADMIN') {
      req.user = user;
      next();
    } else {
      return next(new AppError('Forbidden: Access denied.', 403));
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return next(new AppError('Unauthorized: user verification failed.', 401));
  }
};

module.exports = authorizeAdmin;
