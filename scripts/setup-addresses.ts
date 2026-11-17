import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const sql = await readFile(resolve("prisma/addresses.sql"), "utf8");
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
    const columns = await prisma.$queryRaw<Array<{ Field: string }>>`SHOW COLUMNS FROM CustomerAddress LIKE 'subdistrict'`;
    if (columns.length === 0) {
      await prisma.$executeRaw`ALTER TABLE CustomerAddress ADD COLUMN subdistrict VARCHAR(100) NOT NULL DEFAULT '' AFTER district`;
    }
    console.log("Address table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create address table."); process.exitCode = 1; });
