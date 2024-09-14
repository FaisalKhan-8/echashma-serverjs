const { ZodError } = require("zod");

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: err.errors,
        });
      }
      next(err);
    }
  };
};

module.exports = validateRequest;
