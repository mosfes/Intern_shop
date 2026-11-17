import "dotenv/config";
import { maintainStock } from "../src/lib/stock-maintenance";
import { prisma } from "../src/lib/prisma";

maintainStock().then((result) => console.log(result)).catch(() => {
  console.error("Stock maintenance failed."); process.exitCode = 1;
}).finally(() => prisma.$disconnect());
