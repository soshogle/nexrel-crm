import { PrismaClient, Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Serverless-optimized Prisma client - Neon DB
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set!');
  console.error('   This will cause database connection failures.');
} else if (databaseUrl.includes('host:5432')) {
  console.error('❌ DATABASE_URL contains placeholder "host:5432"!');
  console.error('   This is incorrect - please set a real database URL.');
} else {
  console.log('✅ DATABASE_URL is set:', databaseUrl.substring(0, 30) + '...');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
})

// In development, reuse the client to avoid too many connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export { Prisma }
