const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient({
  log: ["query", "error"],
});

module.exports = db;
