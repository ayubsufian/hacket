// =============================================================================
// HackET — Prisma Client Singleton (Prisma 7.x)
// Uses @prisma/adapter-pg for direct PostgreSQL connections.
// Ensures a single PrismaClient instance is reused across hot-reloads in dev.
// =============================================================================

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

function createPrismaClient() {
  // Create a pg Pool for the adapter
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  // Create the Prisma adapter
  const adapter = new PrismaPg(pool);

  const logLevel =
    process.env.NODE_ENV === 'production'
      ? ['error']
      : ['query', 'info', 'warn', 'error'];

  return new PrismaClient({
    adapter,
    log: logLevel,
  });
}

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  // Prevent multiple instances during hot-reload in development
  if (!global.__prisma) {
    global.__prisma = createPrismaClient();
  }
  prisma = global.__prisma;
}

module.exports = prisma;
