import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const sql = await readFile(resolve("prisma/stock.sql"), "utf8");
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(statement);
    console.log("Stock coordination tables are ready. MockAPI balances remain in MockAPI.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create stock coordination tables."); process.exitCode = 1; });
