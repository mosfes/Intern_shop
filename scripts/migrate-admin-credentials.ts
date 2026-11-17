import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type CountRow = { count: bigint | number };
async function main() {
  try {
    const old = await prisma.$queryRaw<CountRow[]>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AdminEmail'`;
    if (!Number(old[0].count)) { console.log("Legacy administrator table is already removed."); return; }
    if (process.argv.includes("--drop-legacy")) {
      const missing = await prisma.$queryRaw<CountRow[]>`SELECT COUNT(*) AS count FROM AdminEmail e LEFT JOIN AdminCredential c ON c.email = e.email AND c.active = true WHERE c.email IS NULL`;
      if (Number(missing[0].count)) throw new Error("Administrator migration verification failed");
      await prisma.$executeRawUnsafe("DROP TABLE `AdminEmail`");
      console.log("Verified administrator migration and removed legacy table.");
      return;
    }
    await prisma.$executeRawUnsafe("ALTER TABLE `AdminCredential` MODIFY `username` VARCHAR(64) NULL, MODIFY `passwordHash` VARCHAR(255) NULL");
    const columns = await prisma.$queryRaw<CountRow[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AdminCredential' AND COLUMN_NAME = 'active'`;
    if (!Number(columns[0].count)) await prisma.$executeRawUnsafe("ALTER TABLE `AdminCredential` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT false");
    // Existing password hashes and usernames stay intact. Previously revoked accounts stay inactive.
    await prisma.$executeRawUnsafe("UPDATE `AdminCredential` c JOIN `AdminEmail` e ON c.email = e.email SET c.active = true");
    await prisma.$executeRawUnsafe("INSERT INTO `AdminCredential` (`email`, `username`, `passwordHash`, `active`, `version`, `updatedAt`) SELECT `email`, NULL, NULL, true, 1, CURRENT_TIMESTAMP(3) FROM `AdminEmail` ON DUPLICATE KEY UPDATE `active` = true");
    await prisma.$executeRawUnsafe("ALTER TABLE `AdminCredential` MODIFY `active` BOOLEAN NOT NULL DEFAULT true");
    const missing = await prisma.$queryRaw<CountRow[]>`SELECT COUNT(*) AS count FROM AdminEmail e LEFT JOIN AdminCredential c ON c.email = e.email AND c.active = true WHERE c.email IS NULL`;
    if (Number(missing[0].count)) throw new Error("Administrator migration verification failed");
    console.log("All legacy administrators migrated. Existing credentials preserved.");
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error("Administrator migration failed:", error.name); process.exitCode = 1; });
