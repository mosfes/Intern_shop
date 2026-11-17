import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const sql = await readFile(resolve("prisma/accounts.sql"), "utf8");
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    const columns = await prisma.$queryRaw<{ count: bigint | number }[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AdminCredential' AND COLUMN_NAME = 'mustChangePassword'`;
    if (!Number(columns[0].count)) await prisma.$executeRawUnsafe("ALTER TABLE `AdminCredential` ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false");
    console.log("Account tables are ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create account tables."); process.exitCode = 1; });
