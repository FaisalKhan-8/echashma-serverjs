const { PrismaClient } = require('@prisma/client');

let db;

// In serverless environments, reuse the Prisma Client instance across function invocations
if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient();
} else {
  // In development, we can safely reuse the Prisma Client instance in memory
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  db = global.prisma;
}

module.exports = db;
