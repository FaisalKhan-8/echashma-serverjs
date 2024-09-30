const jwt = require("jsonwebtoken");
const { AppError } = require("../errors/AppError.js"); // Adjust the path as needed

const authenticateUser = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  // Check if the token is provided
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authorization token is missing!", 401));
  }

  // Extract the token from the header
  const token = authHeader.split(" ")[1];

  try {
    // Verify the token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure the JWT secret is set in your environment variables

    // Attach the user information to the request object
    req.user = {
      id: decoded.userId, // Assuming the payload contains user id
      role: decoded.role, // Assuming the payload contains user role
      // Add any other fields you need from the token, such as email, name, etc.
    };

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Handle token verification errors
    return next(new AppError("Invalid or expired token!", 401));
  }
};

module.exports = authenticateUser;
