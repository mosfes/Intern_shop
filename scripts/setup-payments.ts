import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const sql = await readFile(resolve("prisma/payments.sql"), "utf8");
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    // CREATE TABLE IF NOT EXISTS leaves older tables as they were, so add later indexes separately.
    const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'CheckoutPayment' AND index_name = 'CheckoutPayment_status_createdAt_idx'`;
    if (!Number(count)) {
      await prisma.$executeRawUnsafe("CREATE INDEX `CheckoutPayment_status_createdAt_idx` ON `CheckoutPayment` (`status`, `createdAt`)");
      console.log("Added CheckoutPayment (status, createdAt) index.");
    }
    console.log("Payment table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create payment table."); process.exitCode = 1; });
