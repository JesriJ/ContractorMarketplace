import { prisma } from "@/lib/prisma";

export type DatabaseHealth = {
  ok: boolean;
  message: string;
};

export async function checkDatabaseConnection(): Promise<DatabaseHealth> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, message: "Connected to PostgreSQL." };
  } catch {
    return { ok: false, message: "Database connection failed." };
  }
}
