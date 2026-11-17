import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    await prisma.$executeRawUnsafe(await readFile(resolve("prisma/flash-sale.sql"), "utf8"));
    await prisma.$executeRawUnsafe(await readFile(resolve("prisma/flash-sale-items.sql"), "utf8"));
    console.log("Flash Sale settings table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to set up Flash Sale settings."); process.exitCode = 1; });
