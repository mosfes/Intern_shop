import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    await prisma.$executeRawUnsafe(await readFile(resolve("prisma/image-uploads.sql"), "utf8"));
    console.log("ImageUpload lifecycle table is ready.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create image upload table."); process.exitCode = 1; });
