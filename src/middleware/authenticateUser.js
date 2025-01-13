const jwt = require('jsonwebtoken');
const { AppError } = require('../errors/AppError.js'); // Adjust the path as needed

const authenticateUser = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  // Check if the token is provided
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authorization token is missing!', 401));
  }

  // Extract the token from the header
  const token = authHeader.split(' ')[1];

  try {
    // Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user information to the request object
    req.user = {
      userId: decoded.userId, // Changed from id to userId to match your GetLoggedInUser logic
      role: decoded.role,
      companyId: decoded.companyId,
      branchId: decoded.branchId,
      // Add any other fields you need from the token, such as email, name, etc.
    };

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Handle token verification errors
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token has expired!', 401));
    }
    return next(new AppError('Invalid token!', 401));
  }
};

module.exports = authenticateUser;
