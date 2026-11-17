import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/prisma";
import { createDatabaseProduct } from "../src/lib/product-storage";
import { validateProductInput } from "../src/lib/product-management";
import type { Product } from "../src/lib/types";
import { builtInSpecFields, builtInSpecSlugs } from "../src/lib/product-specification-templates";

async function main() {
  try {
    const sql = await readFile(resolve("prisma/products.sql"), "utf8");
    const hadSpecFields = await prisma.$queryRaw<{ count: bigint | number }[]>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CategorySpecField'`;
    const constraints = await prisma.$queryRaw<{ name: string }[]>`SELECT CONSTRAINT_NAME AS name FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE()`;
    const existingConstraints = new Set(constraints.map((row) => row.name));
    for (const statement of sql.split(";").map((part) => part.trim()).filter(Boolean)) {
      const constraint = statement.match(/ADD CONSTRAINT `([^`]+)`/);
      if (constraint && existingConstraints.has(constraint[1])) continue;
      await prisma.$executeRawUnsafe(statement);
    }
    // Upgrade: tables created before the "hint" column existed. Fill the starter explanations once.
    const hintColumn = await prisma.$queryRaw<{ count: bigint | number }[]>`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CategorySpecField' AND COLUMN_NAME = 'hint'`;
    if (!Number(hintColumn[0].count)) {
      await prisma.$executeRawUnsafe("ALTER TABLE `CategorySpecField` ADD COLUMN `hint` VARCHAR(500) NOT NULL DEFAULT '' AFTER `example`");
      for (const slug of builtInSpecSlugs()) {
        const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
        if (!category) continue;
        for (const field of builtInSpecFields(slug)) await prisma.categorySpecField.updateMany({ where: { categoryId: category.id, label: field.label }, data: { hint: field.hint ?? "", example: field.example } });
      }
    }
    // First run only: give the known categories their starter specs. After that the admin owns them.
    let seeded = 0;
    if (!Number(hadSpecFields[0].count)) {
      for (const slug of builtInSpecSlugs()) {
        const category = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
        const fields = builtInSpecFields(slug);
        if (!category || await prisma.categorySpecField.count({ where: { categoryId: category.id } })) continue;
        await prisma.categorySpecField.createMany({ data: fields.map((field, position) => ({ categoryId: category.id, label: field.label, example: field.example, hint: field.hint ?? "", compatibility: !!field.compatibility, powerAdvice: !!field.powerAdvice, position })) });
        seeded++;
      }
    }
    // This only upgrades records previously created in TiDB by this app. No MockAPI import.
    const legacy = await prisma.$queryRaw<{ count: bigint | number }[]>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CatalogProduct'`;
    let migrated = 0;
    if (Number(legacy[0].count)) {
      const rows = await prisma.$queryRawUnsafe<{ id: string; slug: string; data: unknown }[]>("SELECT id, slug, data FROM CatalogProduct");
      for (const row of rows) {
        if (await prisma.product.findUnique({ where: { id: row.id }, select: { id: true } })) continue;
        const data = (typeof row.data === "string" ? JSON.parse(row.data) : row.data) as Product;
        const category = { slug: data.category, name: data.category, nameTh: data.category, description: "", image: "" };
        const input = validateProductInput({ ...data, slug: row.slug }, [category]);
        await createDatabaseProduct(input, category, { id: row.id, rating: data.rating ?? 0, reviewCount: data.reviewCount ?? 0, reviews: data.reviews ?? [] });
        migrated++;
      }
      const backup = await prisma.$queryRaw<{ count: bigint | number }[]>`SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CatalogProductLegacy'`;
      if (!Number(backup[0].count)) await prisma.$executeRawUnsafe("RENAME TABLE CatalogProduct TO CatalogProductLegacy");
    }
    console.log(`Product tables and foreign keys are ready. Upgraded ${migrated} earlier TiDB records. Seeded default specs for ${seeded} categories. No MockAPI products were imported.`);
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Unable to create product table."); process.exitCode = 1; });
