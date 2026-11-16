import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Builds the MariaDB driver adapter from DATABASE_URL.
 * TiDB is MySQL-compatible; TiDB Cloud requires TLS, so SSL is enabled for any
 * non-local host (override with DATABASE_SSL=false / true).
 */
function createAdapter() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env first.");
  }

  const url = new URL(raw);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const useSsl = process.env.DATABASE_SSL
    ? process.env.DATABASE_SSL === "true"
    : !isLocal;

  const database = decodeURIComponent(url.pathname.slice(1));

  return new PrismaMariaDb(
    {
      host: url.hostname,
      port: url.port ? Number(url.port) : 4000,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: 5,
      connectTimeout: 10_000,
      acquireTimeout: 10_000,
      ssl: useSsl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
    },
    { database },
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
