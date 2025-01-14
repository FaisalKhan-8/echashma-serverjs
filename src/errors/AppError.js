class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    this.isOperational = true; // Marks the error as operational
    Error.captureStackTrace(this, this.constructor); // Captures the stack trace for better debugging
  }
}

module.exports = { AppError };
