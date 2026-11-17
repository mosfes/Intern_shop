import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_PROMOTIONS } from "../src/lib/promotions";

async function main() {
  try {
    await prisma.$executeRawUnsafe(await readFile(resolve("prisma/promotions.sql"), "utf8"));
    // Seed the original homepage content once, so the storefront looks the same until an admin edits it.
    if (await prisma.promotion.count() === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- default ids are placeholders
      await prisma.promotion.createMany({ data: DEFAULT_PROMOTIONS.map(({ id, ...row }) => row) });
      console.log(`Promotion table is ready; seeded ${DEFAULT_PROMOTIONS.length} default promotions.`);
    } else console.log("Promotion table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error("Unable to set up promotions.", error instanceof Error ? error.message : ""); process.exitCode = 1; });
