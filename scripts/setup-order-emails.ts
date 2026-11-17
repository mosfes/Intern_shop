import "dotenv/config";
import { readFile } from "node:fs/promises";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    await prisma.$executeRawUnsafe(await readFile("prisma/order-emails.sql", "utf8"));
    console.log("Order email table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create order email table."); process.exitCode = 1; });
