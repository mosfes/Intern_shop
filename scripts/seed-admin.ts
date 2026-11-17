import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Run explicitly during first setup. Never run on login: removed rights stay removed.
async function main() {
  try {
    await prisma.adminCredential.upsert({
      where: { email: "mosfes3@gmail.com" },
      create: { email: "mosfes3@gmail.com", active: true },
      update: { active: true, version: { increment: 1 } },
    });
    console.log("Added mosfes3@gmail.com to the administrator list.");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to seed administrator list."); process.exitCode = 1; });
