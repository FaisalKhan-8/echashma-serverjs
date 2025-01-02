const { PrismaClient } = require('@prisma/client');

let db;

// Reuse the Prisma Client instance across function invocations in serverless environments
if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Log configuration for production
  });
} else {
  // In development, ensure Prisma Client instance is reused to prevent multiple instances
  if (!global.db) {
    global.db = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'], // Log configuration for development
    });
  }
  db = global.db;
}

module.exports = db;
