import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const sql = await readFile(resolve("prisma/admin-logs.sql"), "utf8");
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    // Upgrade existing installations without deleting historical rows.
    const columns = await prisma.$queryRaw<{ name: string }[]>`SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AdminActivityLog'`;
    const existing = new Set(columns.map((column) => column.name));
    const additions = { ipAddress: 45, userAgent: 1000, country: 2, region: 120, city: 120, contextSource: 20 };
    for (const [name, length] of Object.entries(additions)) {
      if (!existing.has(name)) await prisma.$executeRawUnsafe(`ALTER TABLE \`AdminActivityLog\` ADD COLUMN \`${name}\` VARCHAR(${length}) NULL`);
    }
    console.log("Admin activity log table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create admin activity log table."); process.exitCode = 1; });
