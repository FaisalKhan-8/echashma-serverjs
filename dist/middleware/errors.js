"use strict";

var _require = require("zod"),
  ZodError = _require.ZodError;
var _require2 = require("../errors/AppError"),
  AppError = _require2.AppError;
var errorHandler = function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message
    });
  }
  console.error(err);
  return res.status(500).json({
    status: "error",
    message: "Internal Server Error"
  });
};
module.exports = {
  errorHandler: errorHandler
};