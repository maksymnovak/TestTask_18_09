import { PrismaClient } from '@prisma/client';
import { config } from './environment';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.server.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });

if (config.server.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Connection health check
export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Database utilities
export const db = {
  // Transaction helper
  transaction: prisma.$transaction.bind(prisma),

  // Connection utilities
  connect: prisma.$connect.bind(prisma),
  disconnect: prisma.$disconnect.bind(prisma),

  // Health check
  healthCheck,

  // Raw queries (use sparingly)
  queryRaw: prisma.$queryRaw.bind(prisma),
  executeRaw: prisma.$executeRaw.bind(prisma),

  // Models
  user: prisma.user,
  company: prisma.company,
  document: prisma.document,
  notification: prisma.notification,
  message: prisma.message,
  auditLog: prisma.auditLog,
} as const;

export default prisma;