import { PrismaClient } from "@prisma/client";

/**
 * Next.js reloads modules in development. Creating a new PrismaClient on every
 * reload would exhaust PostgreSQL connections, so we reuse one client on
 * `globalThis` outside of production.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
