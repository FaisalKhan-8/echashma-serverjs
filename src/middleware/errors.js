const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const { AppError } = require("../errors/AppError");

function zodMessage(err) {
  const parts = (err.errors || [])
    .map((issue) => (issue && issue.message ? String(issue.message).trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return "Please check the form and try again.";
  return parts.join(". ").replace(/\.\./g, ".");
}

function prismaMessage(err) {
  if (err.code === "P2002") {
    const target = err.meta && err.meta.target;
    const field = Array.isArray(target) ? target.filter(Boolean).join(", ") : target;
    return field
      ? `This ${field} is already in use.`
      : "This value is already in use.";
  }
  if (err.code === "P2003") {
    return "A related record is missing. Check the selected items and try again.";
  }
  if (err.code === "P2025") {
    return "That record was not found.";
  }
  return null;
}

const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "error",
      message: zodMessage(err),
      errors: err.errors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const message = prismaMessage(err);
    if (message) {
      const status = err.code === "P2025" ? 404 : 400;
      return res.status(status).json({
        status: "error",
        message,
      });
    }
  }

  console.error(err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong. Please try again.",
  });
};

module.exports = { errorHandler };
