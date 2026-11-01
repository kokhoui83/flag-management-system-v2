import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Creates the Prisma client for the management API. The MariaDB driver adapter
 * owns a connection pool; Prisma manages its lifecycle (see ADR-0007, which moved
 * the system of record from Kysely to Prisma).
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaMariaDb(databaseUrl);
  return new PrismaClient({ adapter });
}

export async function closePrismaClient(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}
